-- Adiciona suporte ao modelo gpt-5.2 no sistema de chats
-- Atualiza o CHECK constraint do campo public.chats.llm_model

ALTER TABLE public.chats
  DROP CONSTRAINT IF EXISTS chats_llm_model_check;

ALTER TABLE public.chats
  ADD CONSTRAINT chats_llm_model_check
  CHECK (
    llm_model IN (
      'gpt-4',
      'gpt-4-turbo',
      'gpt-5.2',
      'gemini-2.5-flash',
      'claude-sonnet-4.5'
    )
  );

