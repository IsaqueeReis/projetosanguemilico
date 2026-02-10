
-- TABELAS DO MÓDULO DE REDAÇÃO (MENTORIA PREMIUM)

CREATE TABLE IF NOT EXISTS essay_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL, -- Texto de apoio
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS essay_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES essay_topics(id),
    student_id TEXT NOT NULL, -- Logical link to users table (string id)
    student_name TEXT NOT NULL, -- Snapshot for ease of display
    content_text TEXT, -- Texto da redação
    file_url TEXT, -- Opcional: URL se for upload de PDF/Imagem
    status TEXT CHECK (status IN ('PENDING', 'CORRECTING', 'DONE')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS essay_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES essay_submissions(id) ON DELETE CASCADE,
    mentor_id TEXT NOT NULL, -- Logical link
    final_score NUMERIC(5,2) NOT NULL,
    feedback_text TEXT NOT NULL,
    competencies_json JSONB, -- { c1: 200, c2: 180... }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELAS AUXILIARES PARA IA (BANCO DE QUESTÕES)
-- Apenas para log/auditoria, não obrigatório para funcionamento
CREATE TABLE IF NOT EXISTS qb_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    image_hash TEXT,
    extracted_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
