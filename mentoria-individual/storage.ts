
import { supabase } from '../services/supabase';
import { MentorshipPlan, MentorshipTask, DAYS_OF_WEEK } from './types';

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
        messages: data.messages || []
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
        messages: plan.messages,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('mentorship_plans')
      .upsert(dbPayload, { onConflict: 'student_id' });
      
    if (error) {
        console.error('Erro ao salvar plano de mentoria:', error);
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

  // NOVO: Reseta o plano mantendo apenas o que não foi cumprido e reagendando a partir de hoje
  resetPlanPreservingCompleted: async (studentId: string) => {
    const currentPlan = await MentorshipStorage.getPlanByStudent(studentId);
    if (!currentPlan) return;

    // 1. Filtra apenas as não cumpridas
    const pendingTasks = currentPlan.tasks.filter(t => !t.isCompleted);

    // 2. Define data de início como Hoje
    const today = new Date();
    
    // 3. Reagenda as tarefas sequencialmente a partir de hoje
    const rescheduledTasks = pendingTasks.map((task, index) => {
        const newDate = new Date(today);
        newDate.setDate(today.getDate() + index); // Um dia após o outro
        
        const dayIndex = newDate.getDay() === 0 ? 6 : newDate.getDay() - 1; // Ajuste para array (0=Seg)
        const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
        const dateStr = newDate.toLocaleDateString('pt-BR').split('/').reverse().join('-');

        return {
            ...task,
            date: dateStr,
            dayOfWeek: dayName
        };
    });

    const newPlan: MentorshipPlan = {
        ...currentPlan,
        startDate: today.toISOString().split('T')[0],
        tasks: rescheduledTasks
    };

    await MentorshipStorage.savePlan(newPlan);
    return newPlan;
  },

  // NOVO: Limpa todas as tarefas (Zera tudo)
  clearPlan: async (studentId: string) => {
    const currentPlan = await MentorshipStorage.getPlanByStudent(studentId);
    if (!currentPlan) return;

    const emptyPlan: MentorshipPlan = {
        ...currentPlan,
        tasks: [],
        messages: [] // Opcional: limpar mensagens também se desejar "reset total"
    };

    await MentorshipStorage.savePlan(emptyPlan);
    return emptyPlan;
  }
};
