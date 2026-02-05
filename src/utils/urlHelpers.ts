/**
 * Converte uma URL do Supabase Storage para URL customizada usando o domínio do app
 * 
 * Exemplo:
 * Input:  https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/REP-123/foto.jpg
 * Output: https://<backend>/functions/v1/foto-proxy/REP-123/foto.jpg
 */
export function getCustomPhotoUrl(supabaseUrl: string): string {
  if (!supabaseUrl) return supabaseUrl;
  
  // Usa o domínio customizado do app (ex: reposicao.revalle.com.br)
  // O PhotoProxyRedirect no app vai redirecionar para o backend real
  const appOrigin = typeof window !== 'undefined' 
    ? window.location.origin 
    : import.meta.env.VITE_SUPABASE_URL;
  
  if (!appOrigin) return supabaseUrl;

  // Se já for URL do foto-proxy no domínio do app, retornar como está
  if (supabaseUrl.startsWith(appOrigin) && supabaseUrl.includes('/functions/v1/foto-proxy/')) {
    return supabaseUrl;
  }

  // Extrair o path da foto - pode vir do storage ou de um foto-proxy em outro domínio
  let imagePath: string | null = null;

  // Caso 1: URL do storage do Supabase
  const storageMatch = supabaseUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (storageMatch?.[1]) {
    imagePath = storageMatch[1];
  }

  // Caso 2: URL de foto-proxy em qualquer domínio
  const proxyMatch = supabaseUrl.match(/\/functions\/v1\/foto-proxy\/(.+)$/);
  if (proxyMatch?.[1]) {
    imagePath = proxyMatch[1];
  }

  if (!imagePath) return supabaseUrl;

  // Retorna usando o domínio customizado do app
  return `${appOrigin}/functions/v1/foto-proxy/${imagePath}`;
}

/**
 * Converte múltiplas URLs de fotos para formato customizado
 */
export function convertPhotosToCustomUrls(photos: {
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
}): {
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
} {
  return {
    fotoMotoristaPdv: photos.fotoMotoristaPdv ? getCustomPhotoUrl(photos.fotoMotoristaPdv) : undefined,
    fotoLoteProduto: photos.fotoLoteProduto ? getCustomPhotoUrl(photos.fotoLoteProduto) : undefined,
    fotoAvaria: photos.fotoAvaria ? getCustomPhotoUrl(photos.fotoAvaria) : undefined,
  };
}

/**
 * Converte qualquer URL de foto (proxy ou storage) para URL direta do Supabase Storage.
 * Útil para exibição em tags <img> que precisam funcionar em qualquer ambiente.
 * 
 * Exemplo:
 * Input:  https://reposicao.revalle.com.br/functions/v1/foto-proxy/REP-123/foto.jpg
 * Output: https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/REP-123/foto.jpg
 */
export function getDirectStorageUrl(photoUrl: string): string {
  if (!photoUrl) return photoUrl;
  
  // Usar variável de ambiente ou fallback para o ID do projeto
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'miwbbdhfbpmcrfbpulkj';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${supabaseProjectId}.supabase.co`;

  // Extrair o path da foto de qualquer formato
  let imagePath: string | null = null;

  // Caso 1: URL de foto-proxy (qualquer domínio)
  const proxyMatch = photoUrl.match(/\/functions\/v1\/foto-proxy\/(.+)$/);
  if (proxyMatch?.[1]) {
    imagePath = proxyMatch[1];
  }

  // Caso 2: URL do storage do Supabase
  if (!imagePath) {
    const storageMatch = photoUrl.match(/\/fotos-protocolos\/(.+)$/);
    if (storageMatch?.[1]) {
      imagePath = storageMatch[1];
    }
  }

  if (!imagePath) return photoUrl;

  // Retorna URL direta do Storage
  return `${supabaseUrl}/storage/v1/object/public/fotos-protocolos/${imagePath}`;
}
