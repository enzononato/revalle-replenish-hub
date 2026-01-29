/**
 * Converte uma URL do Supabase Storage para URL customizada usando o domínio do app
 * 
 * Exemplo:
 * Input:  https://miwbbdhfbpmcrfbpulkj.supabase.co/storage/v1/object/public/fotos-protocolos/REP-123/foto.jpg
 * Output: https://revalle-flow-sync.lovable.app/functions/v1/foto-proxy/REP-123/foto.jpg
 */
export function getCustomPhotoUrl(supabaseUrl: string): string {
  if (!supabaseUrl) return supabaseUrl;
  
  // Extrair o path da foto do bucket fotos-protocolos
  const match = supabaseUrl.match(/\/fotos-protocolos\/(.+)$/);
  if (!match || !match[1]) return supabaseUrl;
  
  const imagePath = match[1];
  
  // Usar o domínio publicado do projeto
  const baseDomain = 'https://revalle-flow-sync.lovable.app';
  
  return `${baseDomain}/functions/v1/foto-proxy/${imagePath}`;
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
