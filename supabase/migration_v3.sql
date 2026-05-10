-- ============================================================
-- MIGRATION V3 — Length mode per session
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Add messages_limit to game_sessions (null = use plan default)
alter table public.game_sessions
  add column if not exists messages_limit integer;
