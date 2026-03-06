

## Correção: Logs de falha de login do motorista não são salvos

### Problema identificado
A função `logLoginAttempt` em `MotoristaAuthContext.tsx` não verifica o retorno da inserção no banco. O client retorna `{ data, error }` sem lançar exceção, então o `try/catch` nunca captura erros de inserção. Isso faz com que falhas de login não sejam registradas silenciosamente.

### Causa raiz
```typescript
// Código atual - NÃO verifica o erro retornado
try {
  await supabase.from('motorista_login_logs').insert({...});
} catch (e) {
  console.error('Erro ao registrar log de login:', e);
}
```

### Solução
Alterar `logLoginAttempt` em **`src/contexts/MotoristaAuthContext.tsx`** para:

1. Capturar o objeto `{ error }` retornado pela inserção
2. Se houver erro, logar no console com detalhes para diagnóstico
3. Garantir que a falha no log não interrompa o fluxo de login

```typescript
const logLoginAttempt = async (...) => {
  try {
    const { error } = await supabase.from('motorista_login_logs').insert({...});
    if (error) {
      console.error('Erro ao registrar log de login:', error.message, error);
    }
  } catch (e) {
    console.error('Exceção ao registrar log de login:', e);
  }
};
```

### Arquivo alterado
- `src/contexts/MotoristaAuthContext.tsx` — única mudança, na função `logLoginAttempt`

