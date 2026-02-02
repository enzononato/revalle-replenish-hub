import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function PhotoProxyRedirect() {
  const location = useLocation();

  useEffect(() => {
    // Em domínios customizados, /functions/v1/* cai no SPA (index.html) e vira 404.
    // Aqui redirecionamos o navegador para o domínio do backend, que atende as functions.
    const backendOrigin = import.meta.env.VITE_SUPABASE_URL;
    if (!backendOrigin) return;

    const target = `${backendOrigin}${location.pathname}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location.hash, location.pathname, location.search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Abrindo foto…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Só um instante.</p>
      </div>
    </div>
  );
}
