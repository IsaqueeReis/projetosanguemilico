
-- CRIAÇÃO DAS TABELAS DO BANCO DE QUESTÕES (ISOLADO)

-- 1. Questões
CREATE TABLE IF NOT EXISTS qb_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement TEXT NOT NULL,
    statement_image_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('ABCD', 'ABCDE', 'CERTO_ERRADO')),
    board TEXT NOT NULL, -- Banca (ex: CEBRASPE)
    organ TEXT, -- Órgão (ex: PF, PRF)
    role TEXT, -- Cargo (ex: Agente)
    discipline TEXT NOT NULL,
    subject TEXT NOT NULL,
    sub_subject TEXT, -- Novo campo
    source TEXT, -- Novo campo (Fonte)
    year INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    linked_law_article TEXT, -- Lei seca vinculada
    is_active BOOLEAN DEFAULT TRUE, -- Novo campo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Alternativas
CREATE TABLE IF NOT EXISTS qb_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- A, B, C, D, E, C, E
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Resoluções
CREATE TABLE IF NOT EXISTS qb_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    legal_basis TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Respostas do Aluno (Vínculo Lógico com User)
CREATE TABLE IF NOT EXISTS qb_student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Alterado para TEXT para bater com o ID do Auth/Local
    question_id UUID REFERENCES qb_questions(id) ON DELETE CASCADE,
    selected_alternative_id UUID REFERENCES qb_alternatives(id),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('ANSWERED', 'REVIEW', 'DOUBT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_qb_questions_discipline ON qb_questions(discipline);
CREATE INDEX IF NOT EXISTS idx_qb_questions_sub_subject ON qb_questions(sub_subject);
CREATE INDEX IF NOT EXISTS idx_qb_answers_user ON qb_student_answers(user_id);
