-- =====================================================
-- SCRIPT PARA CORRIGIR PERFIS FALTANTES
-- =====================================================
-- Este script cria perfis para usuários que não têm um
-- Execute no Supabase SQL Editor: https://msmlfjwskkabzfwhurzk.supabase.co
-- =====================================================

-- Inserir perfis para todos os usuários autenticados que não têm perfil
INSERT INTO public.profiles (id, email, name, phone)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'name',
  au.raw_user_meta_data->>'phone'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Verificar quantos perfis foram criados
SELECT COUNT(*) as perfis_criados FROM public.profiles;

-- =====================================================
-- CONCLUÍDO!
-- =====================================================
