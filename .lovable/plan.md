

# Execução do Backup Completo — Plano Confirmado

O plano já foi aprovado. Vou executar as 4 etapas na seguinte ordem:

## Etapa 1: Dump do schema `public`
- Usar `psql` com `COPY ... TO STDOUT CSV HEADER` para exportar todas as 16 tabelas (protocolos, motoristas, pdvs, produtos, gestores, unidades, representantes, user_profiles, user_roles, audit_logs, chat_conversations, chat_messages, chat_participants, alteracao_pedidos_log, alteracao_pedidos_envios, motorista_login_logs)
- Gerar arquivo consolidado `/mnt/documents/backup_public.sql`

## Etapa 2: Export Auth (prioridade: encrypted_password via psql)
- **Tentativa A**: `psql -c "SELECT id, email, encrypted_password, raw_user_meta_data, created_at, email_confirmed_at FROM auth.users"` → CSV
- **Tentativa B (fallback)**: Edge function com `auth.admin.listUsers()` → JSON sem hashes
- Resultado em `/mnt/documents/users_with_passwords.csv` ou `/mnt/documents/users.json`

## Etapa 3: Export do Storage
- Criar e invocar edge function `listar-storage` que lista todos os arquivos do bucket `fotos-protocolos`
- Gerar `/mnt/documents/storage_files.json`

## Etapa 4: Scripts de Migração
- `/mnt/documents/migrar-auth.js` — importa usuários (com password_hash se disponível)
- `/mnt/documents/migrar-storage.js` — baixa e re-envia fotos
- `/mnt/documents/README-migracao.md` — guia passo a passo

## Arquivos finais
| Arquivo | Conteúdo |
|---|---|
| `backup_public.sql` | Dump completo schema public (INSERT statements) |
| `users_with_passwords.csv` ou `users.json` | Auth users com ou sem hashes |
| `storage_files.json` | Manifesto de arquivos do storage |
| `migrar-auth.js` | Script Node.js de importação |
| `migrar-storage.js` | Script Node.js de migração de fotos |
| `README-migracao.md` | Instruções de restauração |

