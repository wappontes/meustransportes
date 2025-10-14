-- Adiciona campo status à tabela de transações
-- Execute este SQL no Supabase SQL Editor

-- Adicionar coluna status à tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'efetivado' 
CHECK (status IN ('programado', 'efetivado'));

-- Criar índice para melhorar performance de queries por status
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Comentário na coluna
COMMENT ON COLUMN public.transactions.status IS 'Status da transação: programado ou efetivado';
