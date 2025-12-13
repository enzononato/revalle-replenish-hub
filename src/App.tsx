import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtocolosProvider } from "@/contexts/ProtocolosContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Protocolos from "./pages/Protocolos";
import Motoristas from "./pages/Motoristas";
import Unidades from "./pages/Unidades";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import AbrirProtocolo from "./pages/AbrirProtocolo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProtocolosProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/abrir-protocolo" element={<AbrirProtocolo />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/protocolos" element={<Protocolos />} />
                <Route path="/motoristas" element={<Motoristas />} />
                <Route path="/unidades" element={<Unidades />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProtocolosProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
