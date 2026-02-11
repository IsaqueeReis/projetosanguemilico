
-- ════════════════════════════════════════════════════════════════
-- MÓDULO FLASHCARDS (SANGUE MILICO)
-- ════════════════════════════════════════════════════════════════

-- 1. Tabela de Baralhos (Decks)
CREATE TABLE IF NOT EXISTS fc_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE, -- Dono (Aluno ou Admin)
    title TEXT NOT NULL,
    description TEXT,
    is_official BOOLEAN DEFAULT FALSE, -- Se TRUE, aparece na loja
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Cartas (Flashcards)
CREATE TABLE IF NOT EXISTS fc_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES fc_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL, -- Pergunta
    back TEXT NOT NULL,  -- Resposta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Progresso (SRS - Spaced Repetition System)
CREATE TABLE IF NOT EXISTS fc_study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES fc_cards(id) ON DELETE CASCADE,
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Quando revisar
    interval INTEGER DEFAULT 0, -- Dias até próxima
    ease_factor NUMERIC DEFAULT 2.5, -- Dificuldade (SM-2)
    repetitions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, card_id) -- Um log por carta por usuário
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_fc_decks_owner ON fc_decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_fc_cards_deck ON fc_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_fc_logs_review ON fc_study_logs(user_id, next_review);

-- 5. Segurança (RLS)
ALTER TABLE fc_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_study_logs ENABLE ROW LEVEL SECURITY;

-- Policies DECKS
CREATE POLICY "Ver decks" ON fc_decks FOR SELECT 
USING (owner_id = auth.uid()::text OR (is_official = TRUE)); -- Ver os seus ou oficiais

CREATE POLICY "Gerir decks" ON fc_decks FOR ALL 
USING (owner_id = auth.uid()::text); -- Só mexe no seu

-- Policies CARDS
CREATE POLICY "Ver cards" ON fc_cards FOR SELECT 
USING (EXISTS (SELECT 1 FROM fc_decks WHERE fc_decks.id = fc_cards.deck_id AND (fc_decks.owner_id = auth.uid()::text OR fc_decks.is_official = TRUE)));

CREATE POLICY "Gerir cards" ON fc_cards FOR ALL 
USING (EXISTS (SELECT 1 FROM fc_decks WHERE fc_decks.id = fc_cards.deck_id AND fc_decks.owner_id = auth.uid()::text));

-- Policies LOGS
CREATE POLICY "Meus logs" ON fc_study_logs FOR ALL 
USING (user_id = auth.uid()::text);

-- OBS: Se estiver usando login 'mockado' sem Supabase Auth real,
-- você pode precisar desativar o RLS temporariamente para testes:
-- ALTER TABLE fc_decks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fc_cards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fc_study_logs DISABLE ROW LEVEL SECURITY;
