import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtocolosProvider } from "@/contexts/ProtocolosContext";
import { MotoristaAuthProvider } from "@/contexts/MotoristaAuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Protocolos from "./pages/Protocolos";
import Motoristas from "./pages/Motoristas";
import Unidades from "./pages/Unidades";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import AbrirProtocolo from "./pages/AbrirProtocolo";
import MotoristaLogin from "./pages/MotoristaLogin";
import MotoristaPortal from "./pages/MotoristaPortal";
import ImportarDados from "./pages/ImportarDados";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProtocolosProvider>
        <MotoristaAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                    path="/importar-dados" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ImportarDados />
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
  </QueryClientProvider>
);

export default App;
