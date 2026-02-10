
import { supabase } from '../services/supabase';
import { EssayTopic, EssaySubmission, EssayReview } from './types';

export const EssayService = {
  // --- TOPICS ---
  async getTopics(): Promise<EssayTopic[]> {
    const { data } = await supabase.from('essay_topics').select('*').eq('active', true).order('created_at', { ascending: false });
    return data || [];
  },
  
  async createTopic(title: string, description: string) {
    return await supabase.from('essay_topics').insert({ title, description });
  },

  // --- SUBMISSIONS ---
  async getStudentSubmissions(studentId: string): Promise<EssaySubmission[]> {
    const { data } = await supabase
      .from('essay_submissions')
      .select(`*, review:essay_reviews(*), topic:essay_topics(title)`)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
      
    // Flatten logic for topic_title if needed
    return (data || []).map((s: any) => ({
        ...s,
        topic_title: s.topic?.title,
        review: s.review?.[0] || null
    }));
  },

  async getAllSubmissions(): Promise<EssaySubmission[]> {
    // Admin view
    const { data } = await supabase
      .from('essay_submissions')
      .select(`*, review:essay_reviews(*), topic:essay_topics(title)`)
      .order('created_at', { ascending: false });
      
    return (data || []).map((s: any) => ({
        ...s,
        topic_title: s.topic?.title,
        review: s.review?.[0] || null
    }));
  },

  async submitEssay(submission: Partial<EssaySubmission>) {
    return await supabase.from('essay_submissions').insert(submission);
  },

  // --- REVIEWS ---
  async submitReview(review: Partial<EssayReview>) {
    const { data, error } = await supabase.from('essay_reviews').insert(review);
    if (!error) {
        // Update status
        await supabase.from('essay_submissions').update({ status: 'DONE' }).eq('id', review.submission_id);
    }
    return { data, error };
  }
};
