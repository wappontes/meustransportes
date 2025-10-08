-- Migração para adicionar campo de telefone na tabela profiles
-- Execute este SQL no Supabase SQL Editor se você já tem o banco de dados criado

-- Adicionar coluna phone na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text;
