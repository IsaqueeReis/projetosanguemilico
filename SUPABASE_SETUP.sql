
-- ════════════════════════════════════════════════════════════════
-- ESTRUTURA DO BANCO DE DADOS - CURSO SANGUE MILICO
-- RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE
-- ════════════════════════════════════════════════════════════════

-- 1. TABELA DE USUÁRIOS (Login Próprio)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Senha simples para este MVP
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('ADMIN', 'STUDENT')) DEFAULT 'STUDENT',
    approved BOOLEAN DEFAULT FALSE,
    plan_id TEXT, -- Vinculo com o plano
    avatar TEXT,
    objective TEXT,
    study_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    achievements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROGRESSO E CONFIGURAÇÕES DO USUÁRIO (Armazenamento flexível)
-- Substitui o localStorage para persistência na nuvem
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL, -- ex: 'stats', 'schedule', 'notebooks'
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

-- 3. CONFIGURAÇÕES GLOBAIS DO APP
-- Armazena Planos, Mensagem do Comando, Vídeo Tutorial
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB
);

-- 4. CONTEÚDO GLOBAL (JSON Stores para simplicidade neste modelo)
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    content JSONB
);

CREATE TABLE IF NOT EXISTS simulados (
    id TEXT PRIMARY KEY,
    content JSONB
);

CREATE TABLE IF NOT EXISTS editais (
    id TEXT PRIMARY KEY,
    content JSONB
);

-- ════════════════════════════════════════════════════════════════
-- MÓDULO FLASHCARDS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fc_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_official BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fc_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES fc_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fc_study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES fc_cards(id) ON DELETE CASCADE,
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interval INTEGER DEFAULT 0,
    ease_factor NUMERIC DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);

-- ════════════════════════════════════════════════════════════════
-- MÓDULO REDAÇÃO (MENTORIA)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS essay_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS essay_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES essay_topics(id) ON DELETE SET NULL, -- Se apagar tema, mantém redação mas sem link
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    content_text TEXT,
    file_url TEXT,
    status TEXT CHECK (status IN ('PENDING', 'CORRECTING', 'DONE')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS essay_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES essay_submissions(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    final_score NUMERIC(5,2) NOT NULL,
    feedback_text TEXT NOT NULL,
    competencies_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- MÓDULO BANCO DE QUESTÕES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS qb_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement TEXT NOT NULL,
    statement_image_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('ABCD', 'ABCDE', 'CERTO_ERRADO')),
    board TEXT NOT NULL,
    organ TEXT,
    role TEXT,
    discipline TEXT NOT NULL,
    subject TEXT NOT NULL,
    sub_subject TEXT,
    source TEXT,
    year INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    linked_law_article TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qb_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS qb_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    legal_basis TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qb_student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    selected_alternative_id UUID REFERENCES qb_alternatives(id),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('ANSWERED', 'REVIEW', 'DOUBT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- MÓDULO MENTORIA INDIVIDUAL (Planner)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mentorship_plans (
    student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    tasks JSONB DEFAULT '[]'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- AJUSTES FINAIS
-- ════════════════════════════════════════════════════════════════

-- Habilita RLS mas cria politica permissiva para este template (simulando backend próprio)
-- Isso evita erros de "Row Level Security policy violated" se o user não estiver logado via Supabase Auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for app logic" ON users FOR ALL USING (true);

-- Repetir para outras tabelas criticas se necessário, ou manter RLS desativado por padrão nas outras
-- Para garantir funcionamento total sem configuração complexa de Auth no Supabase:
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulados DISABLE ROW LEVEL SECURITY;
ALTER TABLE editais DISABLE ROW LEVEL SECURITY;
ALTER TABLE fc_decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE fc_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fc_study_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE essay_topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE essay_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE essay_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE qb_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE qb_alternatives DISABLE ROW LEVEL SECURITY;
ALTER TABLE qb_resolutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE qb_student_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_plans DISABLE ROW LEVEL SECURITY;
