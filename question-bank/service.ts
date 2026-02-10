
import { supabase } from '../services/supabase';
import { QBQuestion, QBFilters, QBStudentAnswer, QuestionType, Difficulty, QBNotebook } from './types';

export const QuestionBankService = {
  // Criar questão (Admin)
  async createQuestion(question: {
    statement: string;
    type: QuestionType;
    board: string;
    organ?: string;
    role?: string;
    discipline: string;
    subject?: string;
    sub_subject?: string;
    source?: string;
    year: number;
    difficulty: Difficulty;
    justification?: string;
    alternatives: { label: string; text: string; is_correct: boolean }[];
  }) {
    // 1. Inserir a Questão (Cabeçalho)
    const { data: qData, error: qError } = await supabase
      .from('qb_questions')
      .insert({
        statement: question.statement,
        type: question.type,
        board: question.board,
        organ: question.organ,
        role: question.role,
        discipline: question.discipline,
        subject: question.subject || question.discipline,
        sub_subject: question.sub_subject,
        source: question.source,
        year: question.year,
        difficulty: question.difficulty,
        is_active: true
      })
      .select()
      .single();

    if (qError || !qData) {
      throw qError || new Error('Erro ao criar questão header');
    }

    // 2. Inserir Alternativas vinculadas
    const alternativesPayload = question.alternatives.map(a => ({
      question_id: qData.id,
      label: a.label,
      text: a.text,
      is_correct: a.is_correct
    }));

    const { error: aError } = await supabase
      .from('qb_alternatives')
      .insert(alternativesPayload);

    if (aError) {
      console.error('Erro ao salvar alternativas', aError);
    }

    // 3. Inserir Justificativa (Resolução)
    if (question.justification) {
        const { error: rError } = await supabase
            .from('qb_resolutions')
            .insert({
                question_id: qData.id,
                comment_text: question.justification
            });
        
        if (rError) console.error('Erro ao salvar justificativa', rError);
    }

    return qData;
  },

  // Buscar questões com filtros avançados
  async fetchQuestions(filters: QBFilters, userId?: string, limit = 20): Promise<QBQuestion[]> {
    let questionIdsToFetch: string[] = [];

    // Lógica do Caderno de Erros MANUAL (Prioridade 1)
    if (filters.notebookId && userId) {
        const notebooks = await this.getUserNotebooks(userId);
        const targetNotebook = notebooks.find(n => n.id === filters.notebookId);
        if (targetNotebook && targetNotebook.questionIds.length > 0) {
            questionIdsToFetch = targetNotebook.questionIds;
        } else {
            return []; // Caderno vazio
        }
    }
    // Lógica do Caderno de Erros AUTOMÁTICO (Prioridade 2)
    else if (filters.only_mistakes && userId) {
        const { data: mistakes } = await supabase
            .from('qb_student_answers')
            .select('question_id')
            .eq('user_id', userId)
            .eq('is_correct', false);
            
        if (mistakes && mistakes.length > 0) {
            questionIdsToFetch = mistakes.map(m => m.question_id);
        } else {
            return [];
        }
    }

    let query = supabase
      .from('qb_questions')
      .select(`
        *,
        alternatives:qb_alternatives(id, label, text, is_correct)
      `)
      .eq('is_active', true)
      .limit(limit)
      .order('created_at', { ascending: false });

    // Aplica filtro de IDs se necessário (Cadernos)
    if (questionIdsToFetch.length > 0) {
        query = query.in('id', questionIdsToFetch);
    }

    // Filtros Exatos
    if (filters.discipline) query = query.eq('discipline', filters.discipline);
    if (filters.year) query = query.eq('year', filters.year);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

    // Filtros Textuais (Case Insensitive Partial Match)
    if (filters.board) query = query.ilike('board', `%${filters.board}%`);
    if (filters.organ) query = query.ilike('organ', `%${filters.organ}%`);
    if (filters.role) query = query.ilike('role', `%${filters.role}%`);
    if (filters.subject) query = query.ilike('subject', `%${filters.subject}%`);
    if (filters.sub_subject) query = query.ilike('sub_subject', `%${filters.sub_subject}%`);
    if (filters.source) query = query.ilike('source', `%${filters.source}%`);
    
    // Busca no enunciado
    if (filters.keyword) query = query.ilike('statement', `%${filters.keyword}%`);

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar questões:', error);
      return [];
    }

    return data as QBQuestion[];
  },

  // Buscar resolução (Justificativa) - Chamado APÓS responder
  async fetchResolution(questionId: string) {
    const { data } = await supabase
      .from('qb_resolutions')
      .select('comment_text, legal_basis, video_url')
      .eq('question_id', questionId)
      .single();
    return data;
  },

  // Registrar resposta
  async submitAnswer(userId: string, answer: QBStudentAnswer) {
    const { error } = await supabase.from('qb_student_answers').insert({
      user_id: userId,
      question_id: answer.question_id,
      selected_alternative_id: answer.selected_alternative_id,
      is_correct: answer.is_correct,
      time_spent_seconds: answer.time_spent_seconds,
      status: 'ANSWERED'
    });
    
    if (error) console.error('Erro ao salvar resposta:', error);
  },

  // Estatísticas Rápidas
  async getUserStats(userId: string) {
    const { data } = await supabase
      .from('qb_student_answers')
      .select('is_correct, time_spent_seconds, created_at')
      .eq('user_id', userId);
      
    if (!data) return { total: 0, accuracy: 0, history: [] };
    
    const total = data.length;
    const correct = data.filter(a => a.is_correct).length;
    
    return {
      total,
      correct,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
      history: data
    };
  },

  // --- GESTÃO DE CADERNOS (NOTEBOOKS) ---
  // Utiliza 'user_progress' para armazenar JSON dos cadernos, evitando migrações complexas agora.
  
  async getUserNotebooks(userId: string): Promise<QBNotebook[]> {
    const { data } = await supabase
      .from('user_progress')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'qb_notebooks')
      .single();
      
    return data?.value || [];
  },

  async saveNotebooks(userId: string, notebooks: QBNotebook[]) {
    await supabase
      .from('user_progress')
      .upsert({ user_id: userId, key: 'qb_notebooks', value: notebooks }, { onConflict: 'user_id, key' });
  },

  async createNotebook(userId: string, name: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const newNotebook: QBNotebook = {
        id: Date.now().toString(),
        name,
        questionIds: [],
        createdAt: new Date().toISOString()
    };
    await this.saveNotebooks(userId, [...notebooks, newNotebook]);
    return newNotebook;
  },

  async addQuestionToNotebook(userId: string, notebookId: string, questionId: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const updated = notebooks.map(n => {
        if (n.id === notebookId) {
            // Evita duplicatas
            if (!n.questionIds.includes(questionId)) {
                return { ...n, questionIds: [...n.questionIds, questionId] };
            }
        }
        return n;
    });
    await this.saveNotebooks(userId, updated);
  },

  async removeQuestionFromNotebook(userId: string, notebookId: string, questionId: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const updated = notebooks.map(n => {
        if (n.id === notebookId) {
            return { ...n, questionIds: n.questionIds.filter(id => id !== questionId) };
        }
        return n;
    });
    await this.saveNotebooks(userId, updated);
  },

  async deleteNotebook(userId: string, notebookId: string) {
      const notebooks = await this.getUserNotebooks(userId);
      const updated = notebooks.filter(n => n.id !== notebookId);
      await this.saveNotebooks(userId, updated);
  }
};
