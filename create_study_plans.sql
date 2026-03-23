-- Create study_plans table
CREATE TABLE IF NOT EXISTS public.study_plans (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.study_plans
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.study_plans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.study_plans
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.study_plans
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
GRANT SELECT ON public.study_plans TO anon;
