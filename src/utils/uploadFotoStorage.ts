import { supabase } from '@/integrations/supabase/client';

/**
 * Converte uma string base64 para Blob
 */
function base64ToBlob(base64: string): Blob {
  // Remove o prefixo data:image/xxx;base64,
  const base64Data = base64.split(',')[1] || base64;
  const mimeType = base64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Delay helper para retry
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Faz upload de uma foto base64 para o storage e retorna a URL pública
 * Com retry automático em caso de falha
 */
export async function uploadFotoParaStorage(
  base64: string,
  protocoloNumero: string,
  tipoFoto: string,
  maxRetries: number = 3,
  onProgress?: (status: 'uploading' | 'retrying' | 'success' | 'error', attempt?: number) => void
): Promise<string | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 1) {
        onProgress?.('uploading');
      } else {
        onProgress?.('retrying', attempt);
      }

      const blob = base64ToBlob(base64);
      const extensao = blob.type.split('/')[1] || 'jpg';
      const nomeArquivo = `${protocoloNumero}/${tipoFoto}_${Date.now()}.${extensao}`;

      const { data, error } = await supabase.storage
        .from('fotos-protocolos')
        .upload(nomeArquivo, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Retorna a URL pública
      const { data: publicUrlData } = supabase.storage
        .from('fotos-protocolos')
        .getPublicUrl(data.path);

      onProgress?.('success');
      return publicUrlData.publicUrl;
    } catch (error) {
      lastError = error as Error;
      console.error(`Tentativa ${attempt}/${maxRetries} falhou:`, error);
      
      if (attempt < maxRetries) {
        // Espera exponencial: 1s, 2s, 4s...
        await delay(Math.pow(2, attempt - 1) * 1000);
      }
    }
  }
  
  console.error('Todas as tentativas de upload falharam:', lastError);
  onProgress?.('error');
  return null;
}

export interface UploadProgress {
  fotoMotoristaPdv: 'pending' | 'uploading' | 'retrying' | 'success' | 'error';
  fotoLoteProduto: 'pending' | 'uploading' | 'retrying' | 'success' | 'error';
  fotoAvaria: 'pending' | 'uploading' | 'retrying' | 'success' | 'error';
  currentRetry?: { foto: string; attempt: number };
}

/**
 * Faz upload de todas as fotos do protocolo e retorna um objeto com as URLs
 * Reporta progresso via callback
 */
export async function uploadFotosProtocolo(
  fotosProtocolo: {
    fotoMotoristaPdv?: string | null;
    fotoLoteProduto?: string | null;
    fotoAvaria?: string | null;
  },
  protocoloNumero: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
}> {
  const resultado: {
    fotoMotoristaPdv?: string;
    fotoLoteProduto?: string;
    fotoAvaria?: string;
  } = {};

  const progress: UploadProgress = {
    fotoMotoristaPdv: fotosProtocolo.fotoMotoristaPdv ? 'pending' : 'success',
    fotoLoteProduto: fotosProtocolo.fotoLoteProduto ? 'pending' : 'success',
    fotoAvaria: fotosProtocolo.fotoAvaria ? 'pending' : 'success',
  };

  onProgress?.(progress);

  const uploads = [];

  if (fotosProtocolo.fotoMotoristaPdv) {
    uploads.push(
      uploadFotoParaStorage(
        fotosProtocolo.fotoMotoristaPdv, 
        protocoloNumero, 
        'motorista_pdv',
        3,
        (status, attempt) => {
          progress.fotoMotoristaPdv = status;
          if (status === 'retrying' && attempt) {
            progress.currentRetry = { foto: 'Motorista/PDV', attempt };
          } else {
            progress.currentRetry = undefined;
          }
          onProgress?.(progress);
        }
      ).then(url => { if (url) resultado.fotoMotoristaPdv = url; })
    );
  }

  if (fotosProtocolo.fotoLoteProduto) {
    uploads.push(
      uploadFotoParaStorage(
        fotosProtocolo.fotoLoteProduto, 
        protocoloNumero, 
        'lote_produto',
        3,
        (status, attempt) => {
          progress.fotoLoteProduto = status;
          if (status === 'retrying' && attempt) {
            progress.currentRetry = { foto: 'Lote Produto', attempt };
          } else {
            progress.currentRetry = undefined;
          }
          onProgress?.(progress);
        }
      ).then(url => { if (url) resultado.fotoLoteProduto = url; })
    );
  }

  if (fotosProtocolo.fotoAvaria) {
    uploads.push(
      uploadFotoParaStorage(
        fotosProtocolo.fotoAvaria, 
        protocoloNumero, 
        'avaria',
        3,
        (status, attempt) => {
          progress.fotoAvaria = status;
          if (status === 'retrying' && attempt) {
            progress.currentRetry = { foto: 'Avaria', attempt };
          } else {
            progress.currentRetry = undefined;
          }
          onProgress?.(progress);
        }
      ).then(url => { if (url) resultado.fotoAvaria = url; })
    );
  }

  await Promise.all(uploads);

  return resultado;
}
