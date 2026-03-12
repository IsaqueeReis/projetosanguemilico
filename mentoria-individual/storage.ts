
import { supabase } from '../services/supabase';
import { MentorshipPlan } from './types';

export const MentorshipStorage = {
  // Busca o plano do aluno no Supabase
  getPlanByStudent: async (studentId: string): Promise<MentorshipPlan | null> => {
    const { data, error } = await supabase
      .from('mentorship_plans')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error || !data) return null;

    // Mapeia os campos do banco (snake_case) para a interface (camelCase)
    return {
        studentId: data.student_id,
        studentName: data.student_name,
        isActive: data.is_active,
        startDate: data.start_date,
        tasks: data.tasks || [],
        completedTasks: data.completed_tasks || [],
        xp: data.xp || 0,
        messages: data.messages || [],
        weeklySchedule: data.weekly_schedule || undefined
    };
  },

  // Salva ou Atualiza o plano no Supabase
  savePlan: async (plan: MentorshipPlan) => {
    const dbPayload = {
        student_id: plan.studentId,
        student_name: plan.studentName,
        is_active: plan.isActive,
        start_date: plan.startDate,
        tasks: plan.tasks,
        completed_tasks: plan.completedTasks || [],
        xp: plan.xp || 0,
        messages: plan.messages,
        weekly_schedule: plan.weeklySchedule,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('mentorship_plans')
      .upsert(dbPayload, { onConflict: 'student_id' });
      
    if (error) {
        console.error('Erro ao salvar plano de mentoria:', error);
        throw error;
    }
  },

  // Inicializa um plano se não existir (Async)
  initPlan: async (studentId: string, studentName: string): Promise<MentorshipPlan> => {
    const existing = await MentorshipStorage.getPlanByStudent(studentId);
    if (existing) return existing;

    const newPlan: MentorshipPlan = {
      studentId,
      studentName,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      tasks: [],
      messages: []
    };
    
    await MentorshipStorage.savePlan(newPlan);
    return newPlan;
  },

  // Deleta o plano do aluno
  deletePlan: async (studentId: string) => {
    const { error } = await supabase
      .from('mentorship_plans')
      .delete()
      .eq('student_id', studentId);
      
    if (error) {
        console.error('Erro ao deletar plano de mentoria:', error);
    }
  }
};
