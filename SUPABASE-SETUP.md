# Configuração do Supabase

## 🚨 ERRO AO SALVAR DADOS? EXECUTE ISTO PRIMEIRO! 🚨

Se você está tendo o erro **"Key is not present in table profiles"** ao salvar:

1. Acesse o **SQL Editor** no Supabase: https://msmlfjwskkabzfwhurzk.supabase.co/project/_/sql
2. Copie e execute o conteúdo do arquivo **`fix-missing-profiles.sql`**
3. Este script cria os perfis faltantes para usuários já registrados
4. Após executar, tente salvar novamente

---

## ⚠️ RESET COMPLETO (Recomendado se houver erros)

Se você está enfrentando erros com o banco de dados, use o script de reset:

1. Acesse seu projeto no Supabase: https://msmlfjwskkabzfwhurzk.supabase.co
2. No menu lateral, clique em **SQL Editor**
3. Crie uma nova query
4. Copie todo o conteúdo do arquivo `reset-database-complete.sql` na raiz do projeto
5. Execute o SQL (botão RUN no canto inferior direito)

**IMPORTANTE:** Este script apaga TUDO e recria do zero. Todos os dados serão perdidos.

---

## Passo 1: Executar SQL no Supabase (Setup Inicial)

1. Acesse seu projeto no Supabase: https://msmlfjwskkabzfwhurzk.supabase.co
2. No menu lateral, clique em **SQL Editor**
3. Crie uma nova query
4. Copie todo o conteúdo do arquivo `database-setup.sql` na raiz do projeto
5. Execute o SQL (botão RUN no canto inferior direito)

Isso irá criar:
- Tabela `profiles` (perfis de usuários com nome, email e telefone)
- Tabela `vehicles` (veículos)
- Tabela `categories` (categorias)
- Tabela `transactions` (transações)
- Tabela `fuelings` (abastecimentos)
- Políticas RLS (Row Level Security) para cada tabela
- Trigger automático para criar perfil quando um usuário se cadastra

## Passo 2: Configurar Authentication

1. No Supabase, vá em **Authentication** → **URL Configuration**
2. Configure:
   - **Site URL**: Cole a URL do seu projeto na Vercel (ex: https://seu-app.vercel.app)
   - **Redirect URLs**: Adicione estas URLs:
     - https://seu-app.vercel.app/reset-password
     - https://seu-app.vercel.app

## Passo 3: Desabilitar confirmação de email (opcional, para testes)

1. No Supabase, vá em **Authentication** → **Providers** → **Email**
2. Desmarque a opção **Confirm email**
3. Isso permitirá que você teste o login sem precisar confirmar o email

## Migração (se necessário)

### Adicionar formas de pagamento e categorias do sistema
Execute o arquivo `migration-add-payment-and-system-categories.sql` no SQL Editor do Supabase.

Este script adiciona:
- Campo `payment_method` nas tabelas `transactions` e `fuelings`
- Campo `location` na tabela `fuelings`  
- Campo `is_system` na tabela `categories`
- Categorias fixas do sistema: **Combustível**, **Manutenção** e **Pedágio** (não podem ser deletadas)
- Integração automática: ao registrar um abastecimento, cria automaticamente uma transação de despesa

### Adicionar campo telefone (migrações antigas)
Se você já tinha o banco criado antes e precisa adicionar o campo telefone:
- Execute o arquivo `migration-add-phone.sql` no SQL Editor

## Problemas Comuns e Soluções

### ❌ Erro ao salvar registros
**Causa**: Falta política RLS de INSERT na tabela profiles
**Solução**: Execute novamente o `database-setup.sql` completo (ele inclui a política de INSERT)

### ❌ Logout não funciona na Vercel
**Causa**: Problemas com navegação em produção
**Solução**: Já corrigido no código usando `window.location.href`

### ❌ Dados do perfil não aparecem
**Causa**: Perfil não foi criado automaticamente no signup
**Solução**: O trigger `handle_new_user` agora está corrigido e inclui todos os campos

## Pronto!

Agora sua aplicação está conectada ao Supabase e pronta para uso em produção.