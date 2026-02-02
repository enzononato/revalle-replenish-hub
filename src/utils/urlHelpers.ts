/**
 * Converte uma URL do Supabase Storage para URL customizada usando o domínio do app
 * 
 * Exemplo:
 * Input:  https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/REP-123/foto.jpg
 * Output: https://<backend>/functions/v1/foto-proxy/REP-123/foto.jpg
 */
export function getCustomPhotoUrl(supabaseUrl: string): string {
  if (!supabaseUrl) return supabaseUrl;
  
  // Se já for URL customizada, retornar como está
  if (supabaseUrl.includes('/functions/v1/foto-proxy/')) {
    return supabaseUrl;
  }
  
  // Extrair o path da foto do bucket fotos-protocolos
  const match = supabaseUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (!match || !match[1]) return supabaseUrl;
  
  const imagePath = match[1];

  // IMPORTANTE:
  // O domínio do site (incluindo domínio customizado) serve apenas o app (SPA).
  // O endpoint /functions/v1/* fica no domínio do backend.
  const backendOrigin = import.meta.env.VITE_SUPABASE_URL;
  if (!backendOrigin) return supabaseUrl;

  return `${backendOrigin}/functions/v1/foto-proxy/${imagePath}`;
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
