import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtocolosProvider } from "@/contexts/ProtocolosContext";

import { MotoristaAuthProvider } from "@/contexts/MotoristaAuthContext";
import { RnAuthProvider } from "@/contexts/RnAuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Protocolos from "./pages/Protocolos";
import Motoristas from "./pages/Motoristas";
import Clientes from "./pages/Clientes";
import Unidades from "./pages/Unidades";
import Usuarios from "./pages/Usuarios";
import Numeros from "./pages/Numeros";
import Configuracoes from "./pages/Configuracoes";
import AbrirProtocolo from "./pages/AbrirProtocolo";
import AlteracaoPedidos from "./pages/AlteracaoPedidos";
import MotoristaLogin from "./pages/MotoristaLogin";
import MotoristaPortal from "./pages/MotoristaPortal";
import RnLogin from "./pages/RnLogin";
import RnPortal from "./pages/RnPortal";
import RepresentantesNegocio from "./pages/RepresentantesNegocio";

import LogsAuditoria from "./pages/LogsAuditoria";
import Sobras from "./pages/Sobras";
import NotFound from "./pages/NotFound";
import PhotoProxyRedirect from "./pages/PhotoProxyRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
          <MotoristaAuthProvider>
          <RnAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <KeyboardShortcutsModal />
                <Routes>
                  <Route path="/functions/v1/foto-proxy/*" element={<PhotoProxyRedirect />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/abrir-protocolo" element={<AbrirProtocolo />} />
                  <Route path="/motorista" element={<Navigate to="/motorista/login" replace />} />
                  <Route path="/motorista/login" element={<MotoristaLogin />} />
                  <Route path="/motorista/portal" element={<MotoristaPortal />} />
                  <Route path="/rn" element={<Navigate to="/rn/login" replace />} />
                  <Route path="/rn/login" element={<RnLogin />} />
                  <Route path="/rn/portal" element={<RnPortal />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<ProtocolosProvider><Dashboard /></ProtocolosProvider>} />
                    <Route path="/protocolos" element={<ProtocolosProvider><Protocolos /></ProtocolosProvider>} />
                    <Route 
                      path="/sobras" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'distribuicao', 'controle']}>
                          <Sobras />
                        </ProtectedRoute>
                      } 
                    />
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
                      path="/numeros" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Numeros />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/configuracoes" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ProtocolosProvider><Configuracoes /></ProtocolosProvider>
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
                    <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/logs-chat" element={<Navigate to="/dashboard" replace />} />
                    <Route 
                      path="/alteracao-pedidos" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'distribuicao', 'controle']}>
                          <AlteracaoPedidos />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/representantes" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <RepresentantesNegocio />
                        </ProtectedRoute>
                      } 
                    />
                    </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </RnAuthProvider>
          </MotoristaAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
