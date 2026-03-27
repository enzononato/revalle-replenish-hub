export type AuthErrorType = 'credentials' | 'timeout' | 'network' | 'unknown';

export interface ClassifiedError {
  type: AuthErrorType;
  message: string;
  shouldRetry: boolean;
}

const TIMEOUT_PATTERNS = [
  'timeout', 'timed out', 'upstream request timeout',
  'context canceled', 'gateway', '504', '502', '503',
  'ECONNRESET', 'ECONNREFUSED',
];

const NETWORK_PATTERNS = [
  'failed to fetch', 'networkerror', 'network request failed',
  'load failed', 'ERR_NETWORK', 'net::',
];

const CREDENTIAL_PATTERNS = [
  'invalid login', 'invalid email', 'email not confirmed',
  'senha incorreta', 'cpf não encontrado', 'não encontrado',
  'credenciais', 'incorrect',
];

function matchesAny(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

export function classifyAuthError(error: unknown): ClassifiedError {
  const msg = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Erro desconhecido';

  if (matchesAny(msg, CREDENTIAL_PATTERNS)) {
    return { type: 'credentials', message: msg, shouldRetry: false };
  }
  if (matchesAny(msg, TIMEOUT_PATTERNS)) {
    return { type: 'timeout', message: msg, shouldRetry: true };
  }
  if (matchesAny(msg, NETWORK_PATTERNS)) {
    return { type: 'network', message: msg, shouldRetry: true };
  }
  return { type: 'unknown', message: msg, shouldRetry: false };
}

export function friendlyMessage(classified: ClassifiedError): string {
  switch (classified.type) {
    case 'credentials':
      return classified.message; // already user-friendly from backend
    case 'timeout':
      return 'O sistema está instável no momento. Tente novamente em alguns segundos.';
    case 'network':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    default:
      return 'Erro inesperado. Tente novamente.';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const classified = classifyAuthError(err);
      if (!classified.shouldRetry || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * attempt;
      console.warn(`[AUTH] Attempt ${attempt}/${maxAttempts} failed (${classified.type}), retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
