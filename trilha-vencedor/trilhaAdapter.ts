
import { MentorshipPlan } from '../mentoria-individual/types';
import { MentorshipStorage } from '../mentoria-individual/storage';

export interface TrilhaResponse {
  hasCustomPlan: boolean;
  planData?: MentorshipPlan;
  timestamp: number;
}

export const TrilhaAdapter = {
  getTrilhaByStudentId: async (studentId: string): Promise<TrilhaResponse | null> => {
    try {
      // Busca na camada de persistência (Supabase)
      const plan = await MentorshipStorage.getPlanByStudent(studentId);

      if (plan && plan.isActive) {
        return {
          hasCustomPlan: true,
          planData: plan,
          timestamp: Date.now()
        };
      }

      return null;

    } catch (error) {
      console.warn('[TrilhaAdapter] Erro ao buscar trilha:', error);
      return null;
    }
  }
};
