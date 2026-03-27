-- Create study_plans table
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    generatedTasks JSONB,
    weeklySchedule JSONB,
    subjectConfigs JSONB,
    extraGoals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read study_plans"
    ON public.study_plans
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert study_plans"
    ON public.study_plans
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update study_plans"
    ON public.study_plans
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete study_plans"
    ON public.study_plans
    FOR DELETE
    TO authenticated
    USING (true);
