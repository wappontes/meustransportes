# Configuração do Supabase

## Passo 1: Executar SQL no Supabase

1. Acesse seu projeto no Supabase: https://msmlfjwskkabzfwhurzk.supabase.co
2. No menu lateral, clique em **SQL Editor**
3. Crie uma nova query
4. Copie todo o conteúdo do arquivo `database-setup.sql` na raiz do projeto
5. Execute o SQL (botão RUN no canto inferior direito)

Isso irá criar:
- Tabela `profiles` (perfis de usuários)
- Tabela `vehicles` (veículos)
- Tabela `categories` (categorias)
- Tabela `transactions` (transações)
- Tabela `fuelings` (abastecimentos)
- Políticas RLS (Row Level Security) para cada tabela
- Trigger automático para criar perfil quando um usuário se cadastra

## Passo 2: Configurar Authentication

1. No Supabase, vá em **Authentication** → **URL Configuration**
2. Configure:
   - **Site URL**: Cole a URL do seu projeto Lovable
   - **Redirect URLs**: Adicione a URL do seu projeto Lovable

## Passo 3: Desabilitar confirmação de email (opcional, para testes)

1. No Supabase, vá em **Authentication** → **Providers** → **Email**
2. Desmarque a opção **Confirm email**
3. Isso permitirá que você teste o login sem precisar confirmar o email

## Pronto!

Agora sua aplicação está conectada ao Supabase e pronta para uso em produção. Todos os dados serão salvos no banco de dados PostgreSQL do Supabase.
