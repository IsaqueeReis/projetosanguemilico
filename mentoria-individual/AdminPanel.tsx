
import React, { useState, useEffect, useMemo } from 'react';
import { MentorshipStorage } from './storage';
import { globalRepo } from '../services/repository'; 
import { MentorshipPlan, MentorshipTask, DAYS_OF_WEEK, TASK_TYPES, TaskType, AIPlanItem, DetectedSubject, SubjectConfig, ExtraGoalConfig, StudyPlan } from './types';
import { User, Plan, UserRole, Edital } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Brain, Calendar, Check, Save, Sparkles, Trash2, List, FileText, ChevronRight, Activity, Zap, Scale, BarChart2, Plus, X, AlertTriangle, Edit2 } from 'lucide-react';
import { Dialog, DialogType } from '../components/ui/Dialog';

const API_KEY = process.env.API_KEY || ''; 

// Componente de Ícone Interno
const Icon = ({ name }: { name: string }) => {
  if (name === 'save') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
  if (name === 'plus') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
  if (name === 'trash') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
  if (name === 'send') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
  return null;
};

interface AdminMentorshipPanelProps {
  users: User[];
  plans: Plan[];
}

export const AdminMentorshipPanel = ({ users, plans }: AdminMentorshipPanelProps) => {
  const premiumPlan = useMemo(() => plans?.find(p => p.name.trim().toUpperCase() === 'MENTORIA PREMIUM'), [plans]);
  
  const premiumStudents = useMemo(() => {
      if (!users || !premiumPlan) return [];
      return users.filter(u => u.role === UserRole.STUDENT && premiumPlan && u.planId === premiumPlan.id);
  }, [users, premiumPlan]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<MentorshipPlan | null>(null);
  const [activeMode, setActiveMode] = useState<'DAILY' | 'PLANNER' | 'FULL_EDIT'>('DAILY');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados Tarefa Manual
  const [taskDay, setTaskDay] = useState(DAYS_OF_WEEK[0]);
  const [taskType, setTaskType] = useState<TaskType>('AULA');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskWeeks, setTaskWeeks] = useState(1);

  // Estados Tarefa Específica
  const [specificDate, setSpecificDate] = useState('');
  const [specificType, setSpecificType] = useState<TaskType>('AULA');
  const [specificSubject, setSpecificSubject] = useState('');
  const [specificDesc, setSpecificDesc] = useState('');

  // Estados Edição de Tarefa
  const [editingTask, setEditingTask] = useState<MentorshipTask | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ subject: '', description: '', dayOfWeek: '', type: '' as TaskType });

  // --- ESTADOS DO GERADOR IA 2.0 ---
  const [plannerStep, setPlannerStep] = useState<'INPUT' | 'CONFIG' | 'PREVIEW'>('INPUT');
  const [plannerInputMode, setPlannerInputMode] = useState<'NEW' | 'SAVED'>('NEW');
  const [rawEdital, setRawEdital] = useState('');
  const [detectedStructure, setDetectedStructure] = useState<DetectedSubject[]>([]);
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfig>>({});
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});
  
  // Configs Globais IA
  const [startDatePlanner, setStartDatePlanner] = useState(new Date().toISOString().split('T')[0]);
  const [calculatedEndDate, setCalculatedEndDate] = useState<string>('');
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [subjectsPerDay, setSubjectsPerDay] = useState(2);
  const [includeLeiSeca, setIncludeLeiSeca] = useState(false);
  
  // Estado de Processamento
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<AIPlanItem[]>([]);

  // Metas Extras
  const [extraGoals, setExtraGoals] = useState<ExtraGoalConfig[]>([]);
  const [showExtraGoalForm, setShowExtraGoalForm] = useState(false);
  const [newExtraGoal, setNewExtraGoal] = useState<ExtraGoalConfig>({
      title: '', type: 'META_EXTRA', description: '', frequency: 'DAILY', selectedDays: []
  });

  // Estado Modal Salvar Edital
  const [showSaveEditalModal, setShowSaveEditalModal] = useState(false);
  const [editalTitle, setEditalTitle] = useState('Edital Verticalizado PM');

  // Estado Modal Salvar Plano de Estudo
  const [showSavePlanModal, setShowSavePlanModal] = useState(false);
  const [planTitle, setPlanTitle] = useState('Plano de Estudo PM');

  // Estado Modal Editar Matéria
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [editingSubjectTopics, setEditingSubjectTopics] = useState("");

  // Estado Modal Implantar Plano
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Estado para planos salvos
  const [savedStudyPlans, setSavedStudyPlans] = useState<StudyPlan[]>([]);

  // --- SISTEMA DE DIÁLOGO CUSTOMIZADO ---
  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      type: DialogType;
      title: string;
      message: string;
      onConfirm?: (value?: string) => void;
      inputPlaceholder?: string;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: undefined, onCancel: () => setDialog(null) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel: () => setDialog(null) });
  };

  const handleDialogConfirm = (value?: string) => {
      if (dialog?.onConfirm) dialog.onConfirm(value);
      setDialog(prev => prev ? { ...prev, isOpen: false } : null);
  };


  useEffect(() => {
    if (premiumStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(premiumStudents[0].id);
    }
  }, [premiumStudents, selectedStudentId]);

  useEffect(() => {
    let isMounted = true;
    const loadPlan = async () => {
        if (selectedStudentId) {
            setLoading(true);
            try {
                const student = premiumStudents.find(s => s.id === selectedStudentId);
                if (student) {
                    const plan = await MentorshipStorage.initPlan(student.id, student.name);
                    if (isMounted) setCurrentPlan(plan);
                }
            } catch (error) {
                console.error("Erro ao carregar plano", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        } else {
            if (isMounted) setCurrentPlan(null);
        }
    };
    
    const loadSavedPlans = async () => {
        try {
            const plans = await globalRepo.getStudyPlans();
            if (isMounted) setSavedStudyPlans(plans);
        } catch (err) {
            console.error("Erro ao carregar planos salvos:", err);
        }
    };

    loadPlan();
    loadSavedPlans();
    
    return () => { isMounted = false; };
  }, [selectedStudentId, premiumStudents]);

  // Helper para formatar data localmente (YYYY-MM-DD)
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- ACTIONS MANUAIS ---
  const handleAddTask = async () => {
    if (!currentPlan || !taskSubject) return;

    // Calcular próxima ocorrência do dia da semana selecionado
    const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const targetIndex = daysMap.indexOf(taskDay);
    const today = new Date();
    
    let targetDate = new Date(today);
    // Encontrar o próximo dia correspondente (incluindo hoje)
    while (targetDate.getDay() !== targetIndex) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const newTasks: MentorshipTask[] = [];
    for (let i = 0; i < taskWeeks; i++) {
        const taskDate = new Date(targetDate);
        taskDate.setDate(taskDate.getDate() + (i * 7));
        const dateStr = getLocalDateStr(taskDate);

        newTasks.push({
          id: Date.now().toString() + i, 
          dayOfWeek: taskDay, 
          type: taskType, 
          subject: taskSubject, 
          description: taskDesc, 
          isCompleted: false,
          date: dateStr
        });
    }

    const updatedPlan = { ...currentPlan, tasks: [...currentPlan.tasks, ...newTasks] };
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao salvar tarefa:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar a tarefa. Verifique sua conexão.");
        return;
    }
    setCurrentPlan(updatedPlan);
    setTaskSubject(''); setTaskDesc(''); setTaskWeeks(1);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, tasks: currentPlan.tasks.filter(t => t.id !== taskId) };
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao deletar tarefa:", err);
        showAlert("Erro de Conexão", "Não foi possível deletar a tarefa. Verifique sua conexão.");
        return;
    }
    setCurrentPlan(updatedPlan);
  };

  const handleEditTask = (task: MentorshipTask) => {
    setEditingTask(task);
    setEditTaskForm({
      subject: task.subject,
      description: task.description || '',
      dayOfWeek: task.dayOfWeek,
      type: task.type
    });
  };

  const handleSaveEditTask = async () => {
    if (!currentPlan || !editingTask) return;
    const updatedTasks = currentPlan.tasks.map(t => 
      t.id === editingTask.id ? { ...t, ...editTaskForm } : t
    );
    const updatedPlan = { ...currentPlan, tasks: updatedTasks };
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao salvar edição:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar a edição. Verifique sua conexão.");
        return;
    }
    setCurrentPlan(updatedPlan);
    setEditingTask(null);
  };

  const handleSendMessage = async () => {
    if (!currentPlan || !newMessage) return;
    const today = new Date();
    const todayStr = getLocalDateStr(today);
    const filteredMessages = currentPlan.messages.filter(m => m.date !== todayStr);
    const updatedPlan = { ...currentPlan, messages: [...filteredMessages, { id: Date.now().toString(), date: todayStr, content: newMessage, isRead: false }] };
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        showAlert("Erro de Conexão", "Não foi possível enviar a mensagem. Verifique sua conexão.");
        return;
    }
    setCurrentPlan(updatedPlan);
    setNewMessage('');
    showAlert('Sucesso', 'Ordem enviada ao aluno!');
  };

  const handleAddSpecificTask = async () => {
    if (!currentPlan || !specificDate || !specificSubject) return showAlert("Erro", "Preencha data e matéria.");
    
    const newTask: MentorshipTask = {
      id: Date.now().toString(),
      dayOfWeek: 'Outro', // Ou algo que indique data específica
      type: specificType,
      subject: specificSubject,
      description: specificDesc,
      isCompleted: false,
      date: specificDate
    };

    const updatedPlan = { ...currentPlan, tasks: [...currentPlan.tasks, newTask] };
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao salvar tarefa:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar a tarefa.");
        return;
    }
    setCurrentPlan(updatedPlan);
    setSpecificDate(''); setSpecificSubject(''); setSpecificDesc('');
  };

  // Passo 1: Analisar Texto e Detectar Estrutura
  const handleAnalyzeEdital = async () => {
      if (!rawEdital) return showAlert("Erro", "Cole o texto do edital para análise.");
      if (!API_KEY) return showAlert("Erro Crítico", "Chave de API (API_KEY) não configurada no sistema.");
      
      setIsAnalyzing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: API_KEY });
          const prompt = `
            Analise o seguinte texto de edital/conteúdo programático de concurso.
            Identifique as Matérias (Disciplinas) e seus respectivos Tópicos.
            Retorne APENAS um JSON válido com a estrutura:
            [
              { "name": "Nome da Matéria", "topics": ["Tópico 1", "Tópico 2"] }
            ]
            
            Texto:
            "${rawEdital}"
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [{ text: prompt }] },
              config: { 
                  temperature: 0.2,
                  responseMimeType: "application/json" // Força retorno JSON
              }
          });

          const text = response.text || '';
          // Limpeza extra caso a IA insira marcadores Markdown
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(jsonStr) as DetectedSubject[];
          
          if (!Array.isArray(data) || data.length === 0) {
              throw new Error("Formato de edital inválido retornado pela IA.");
          }

          setDetectedStructure(data);
          
          // Inicializa configs e horário
          const configs: Record<string, SubjectConfig> = {};
          const initialSchedule: Record<string, string[]> = {};

          data.forEach(s => {
              configs[s.name] = { weight: 2, difficulty: 2 }; // Médio por padrão
          });
          
          DAYS_OF_WEEK.forEach(day => {
              initialSchedule[day] = data.map(s => s.name);
          });

          setSubjectConfigs(configs);
          setWeeklySchedule(initialSchedule);
          setPlannerStep('CONFIG');

      } catch (err) {
          console.error(err);
          showAlert("Falha na Inteligência", "Não foi possível estruturar o edital. Tente limpar o texto e colar apenas a lista de conteúdos.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Passo 2: Exportar para Edital Global (Opcional)
  const handleExportToGlobalEdital = () => {
      if (detectedStructure.length === 0) return;
      setShowSaveEditalModal(true);
  };

  const confirmSaveEdital = async () => {
      if (!editalTitle.trim()) return showAlert("Atenção", "Digite um nome para o edital.");

      try {
          const newEdital: Edital = {
              id: `edital-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
              title: editalTitle,
              allowedPlanIds: [], // Global por padrão
              subjects: detectedStructure.map((ds, sIdx) => ({
                  id: `sub-${Date.now()}-${sIdx}`,
                  name: ds.name,
                  topics: ds.topics.map((t, tIdx) => ({ 
                      id: `top-${Date.now()}-${sIdx}-${tIdx}`, 
                      name: t 
                  }))
              }))
          };

          await globalRepo.saveEdital(newEdital);
          setShowSaveEditalModal(false);
          showAlert("Sucesso", `Edital "${editalTitle}" salvo com sucesso! Verifique na aba 'Gestão de Editais'.`);
      } catch (err) {
          console.error(err);
          showAlert("Erro", "Erro ao salvar edital global. Verifique o console.");
      }
  };

  // Passo 3: Gerar Cronograma Final (Prompt Atualizado - Ciclo Semanal Rigoroso)
  const handleGenerateSchedule = async () => {
      if (!API_KEY) return showAlert("Erro Crítico", "Chave de API ausente.");
      
      setIsGenerating(true);
      try {
          const ai = new GoogleGenAI({ apiKey: API_KEY });
          
          // Prepara contexto das configs
          const configContext = Object.entries(subjectConfigs).map(([name, conf]) => {
              const c = conf as SubjectConfig;
              return `- ${name}: Peso ${c.weight}/3, Dificuldade Aluno ${c.difficulty}/3`;
          }).join('\n');

          // PROMPT FOCADO EM ESTRATÉGIA (NÃO EM DATAS)
          const prompt = `
            Atue como um Mentor Militar de Elite ("Sangue Milico").
            Objetivo: Criar uma SEQUÊNCIA ESTRATÉGICA DE ESTUDOS (Fila de Prioridade).
            NÃO GERE DATAS. Apenas a ordem dos assuntos.
            
            REGRAS DE OURO:
            1. Intercale as matérias para maximizar a retenção (ex: Exatas -> Humanas -> Direito).
            2. Matérias com MAIOR PESO ou DIFICULDADE devem aparecer com mais frequência no ciclo.
            3. Cubra TODOS os tópicos listados abaixo.
            4. IMPORTANTE: Use EXATAMENTE os nomes das matérias listados abaixo. Não altere acentos ou grafia.
            
            PRIORIDADES DE MATÉRIAS:
            ${configContext}
            
            MATÉRIAS DO EDITAL:
            ${JSON.stringify(detectedStructure)}
            
            RETORNO JSON (Array Puro de Strings):
            Retorne uma lista de objetos simples indicando a ordem de estudo.
            [
              {
                "subject": "Nome da Matéria",
                "topic": "Tópico Específico",
                "instructions": "Foco principal (ex: lei seca, cálculo, teoria)"
              }
            ]
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [{ text: prompt }] },
              config: { 
                  temperature: 0.5,
                  responseMimeType: "application/json"
              }
          });

          const text = response.text || '';
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          
          let studyQueue: { subject: string; topic: string; instructions: string }[] = [];
          
          try {
              studyQueue = JSON.parse(jsonStr);
          } catch (parseError) {
              console.error("Erro JSON cru:", text);
              throw new Error("A IA retornou um formato inválido. Tente novamente.");
          }
          
          if (!Array.isArray(studyQueue) || studyQueue.length === 0) {
              throw new Error("A IA não gerou nenhuma missão. Verifique o edital inserido.");
          }

          // --- ALGORITMO DE DISTRIBUIÇÃO TEMPORAL (LOCAL) ---
          const finalSchedule: AIPlanItem[] = [];
          let currentDate = new Date(startDatePlanner + 'T12:00:00'); // Fix timezone issues
          let dayOffset = 0;
          
          // Helper para normalizar strings (remove acentos e lowercase)
          const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          // Group tasks by subject
          const queuesBySubject: Record<string, typeof studyQueue> = {};
          studyQueue.forEach(item => {
              const normSubj = normalize(item.subject);
              if (!queuesBySubject[normSubj]) queuesBySubject[normSubj] = [];
              queuesBySubject[normSubj].push(item);
          });

          let hasMoreTasks = true;

          // Safety break: max 365 days
          while (hasMoreTasks && dayOffset < 365) {
              const dayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
              const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
              const isSunday = currentDate.getDay() === 0;
              
              if (isSunday) {
                  finalSchedule.push({
                      dayOffset,
                      subject: "SIMULADO GERAL",
                      topic: "Simulado Completo",
                      type: "SIMULADO",
                      instructions: "Realizar simulado em condições reais de prova (tempo e isolamento)."
                  });
                  finalSchedule.push({
                      dayOffset,
                      subject: "REDAÇÃO TÁTICA",
                      topic: "Redação Modelo Prova",
                      type: "REVISAO",
                      instructions: "Escrever redação sobre tema atual ou previsto no edital."
                  });
                  
                  // Adicionar Lei Seca e Metas Extras no Domingo também se habilitado
                  if (includeLeiSeca) {
                      finalSchedule.push({
                          dayOffset,
                          subject: "LEGISLAÇÃO",
                          topic: "Leitura de Lei Seca",
                          type: "LEI_SECA",
                          instructions: "Leitura ativa da legislação prevista no edital (30min)."
                      });
                  }
                  
                  extraGoals.forEach(goal => {
                      if (goal.frequency === 'DAILY' || (goal.selectedDays && goal.selectedDays.includes('Domingo'))) {
                          finalSchedule.push({
                              dayOffset,
                              subject: goal.title,
                              topic: goal.description || "Meta Extra Diária",
                              type: "META_EXTRA",
                              instructions: goal.description || "Cumprir meta extra estabelecida."
                          });
                      }
                  });
              } else {
                  const rawAllowedSubjects = weeklySchedule[dayName] || [];
                  const allowedSubjectsNormalized = rawAllowedSubjects.map(normalize);
                  
                  if (includeLeiSeca) {
                      finalSchedule.push({
                          dayOffset,
                          subject: "LEGISLAÇÃO",
                          topic: "Leitura de Lei Seca",
                          type: "LEI_SECA",
                          instructions: "Leitura ativa da legislação prevista no edital (30min)."
                      });
                  }

                  // Adicionar Metas Extras
                  extraGoals.forEach(goal => {
                      if (goal.frequency === 'DAILY' || (goal.selectedDays && goal.selectedDays.includes(dayName))) {
                          finalSchedule.push({
                              dayOffset,
                              subject: goal.title,
                              topic: goal.description || "Meta Extra Diária",
                              type: "META_EXTRA",
                              instructions: goal.description || "Cumprir meta extra estabelecida."
                          });
                      }
                  });

                  // For each allowed subject, pop ONE task
                  allowedSubjectsNormalized.forEach(normSubj => {
                      if (queuesBySubject[normSubj] && queuesBySubject[normSubj].length > 0) {
                          const item = queuesBySubject[normSubj].shift()!;
                          
                          finalSchedule.push({
                              dayOffset,
                              subject: item.subject,
                              topic: item.topic,
                              type: "AULA",
                              instructions: `Estudar teoria e resolver questões: ${item.instructions}`
                          });
                      }
                  });
              }

              currentDate.setDate(currentDate.getDate() + 1);
              dayOffset++;
              
              // Check if there are more tasks
              hasMoreTasks = Object.values(queuesBySubject).some(q => q.length > 0);
          }

          setGeneratedItems(finalSchedule);
          
          const [y, m, d] = startDatePlanner.split('-').map(Number);
          const endDate = new Date(y, m - 1, d);
          endDate.setDate(endDate.getDate() + dayOffset);
          setCalculatedEndDate(endDate.toLocaleDateString('pt-BR'));

          setPlannerStep('PREVIEW');

      } catch (err: any) {
          console.error(err);
          showAlert("Erro na Operação Tática", err.message || 'Falha desconhecida ao gerar cronograma.');
      } finally {
          setIsGenerating(false);
      }
  };

  // Gerenciamento de Metas Extras
  const handleAddExtraGoal = () => {
      if (!newExtraGoal.title) return;
      setExtraGoals([...extraGoals, { ...newExtraGoal }]);
      setNewExtraGoal({ title: '', type: 'META_EXTRA', description: '', frequency: 'DAILY', selectedDays: [] });
      setShowExtraGoalForm(false);
  };

  // Gestão de Crise: Reset e Replanejamento
  const handleResetPlan = async () => {
    if (!currentPlan) return;
    
    showConfirm("Reiniciar Ciclo", "ATENÇÃO: Isso irá apagar todo o progresso do aluno e reiniciar o cronograma a partir de HOJE. O cronograma será recalculado com base nos dias de estudo definidos. Deseja continuar?", async () => {
        try {
            // 1. Identificar tarefas de origem
            const sourceTasks = (currentPlan.originalTasks && currentPlan.originalTasks.length > 0)
                ? currentPlan.originalTasks 
                : currentPlan.tasks;

            if (sourceTasks.length === 0) return showAlert("Erro", "Não há missões para resetar.");

            // 2. Agrupar tarefas por Matéria/Tipo para redistribuição inteligente
            const tasksBySubject: Record<string, MentorshipTask[]> = {};
            sourceTasks.forEach(t => {
                // Chave de agendamento: Prioriza tipos especiais, senão usa a matéria
                let key = t.subject;
                const lowerSubject = t.subject.toLowerCase();
                
                if (t.type === 'SIMULADO') key = 'Simulado';
                else if (t.type === 'REVISAO') key = 'Revisão';
                else if (t.type === 'LEI_SECA') key = 'Lei Seca';
                else if (t.type === 'META_EXTRA') key = 'Meta Extra';
                else if (lowerSubject.includes('redação') || lowerSubject.includes('redacao')) key = 'Redação';
                
                if (!tasksBySubject[key]) tasksBySubject[key] = [];
                tasksBySubject[key].push({
                    ...t,
                    isCompleted: false,
                    description: t.description?.replace(/ \[Replanejado\]| \[Adiantado\]| \[Atrasada\]/g, '') || ''
                });
            });

            // 3. Preparar a redistribuição respeitando o cronograma semanal (Subject-Aware)
            const updatedTasks: MentorshipTask[] = [];
            let dateCursor = new Date();
            dateCursor.setHours(12, 0, 0, 0);

            const schedule = currentPlan.weeklySchedule || {};
            const hasSchedule = Object.values(schedule).some(s => Array.isArray(s) && (s as string[]).length > 0);

            if (!hasSchedule) {
                // Fallback: Se não houver cronograma, distribui sequencialmente nos dias de estudo originais
                sourceTasks.forEach((t, idx) => {
                    const d = new Date(dateCursor);
                    d.setDate(d.getDate() + idx);
                    const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    updatedTasks.push({
                        ...t,
                        isCompleted: false,
                        date: getLocalDateStr(d),
                        dayOfWeek: DAYS_OF_WEEK[dayIndex],
                        description: t.description?.replace(/ \[Replanejado\]| \[Adiantado\]| \[Atrasada\]/g, '') || ''
                    });
                });
            } else {
                let totalTasks = sourceTasks.length;
                let assignedCount = 0;
                let safetyCounter = 0;
                
                // Cópia para não mutar o original durante o shift()
                const workingQueues = { ...tasksBySubject };

                while (assignedCount < totalTasks && safetyCounter < 1000) {
                    const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                    const dayName = DAYS_OF_WEEK[dayIndex];
                    
                    let subjectsForToday: string[] = [];

                    if (dayName === 'Domingo') {
                        // Domingo é exclusivo para Simulado, Redação e tarefas diárias
                        subjectsForToday = ['Simulado', 'Redação', 'Lei Seca', 'Meta Extra', 'Revisão'];
                    } else {
                        // Dias normais: Cronograma + tarefas diárias
                        subjectsForToday = [...(schedule[dayName] || []), 'Lei Seca', 'Meta Extra', 'Revisão'];
                    }

                    if (subjectsForToday.length > 0) {
                        // Usar um Set para evitar duplicatas se o usuário colocou 'Lei Seca' no schedule manual
                        const uniqueSubjects = Array.from(new Set(subjectsForToday));
                        
                        uniqueSubjects.forEach(subjKey => {
                            if (workingQueues[subjKey] && workingQueues[subjKey].length > 0) {
                                const t = workingQueues[subjKey].shift()!;
                                t.date = getLocalDateStr(dateCursor);
                                t.dayOfWeek = dayName;
                                updatedTasks.push(t);
                                assignedCount++;
                            }
                        });
                    }
                    dateCursor.setDate(dateCursor.getDate() + 1);
                    safetyCounter++;
                }

                // Se sobrarem tarefas (matérias não agendadas), anexa ao final
                Object.keys(workingQueues).forEach(subjKey => {
                    const list = workingQueues[subjKey];
                    list.forEach(t => {
                        const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                        t.date = getLocalDateStr(dateCursor);
                        t.dayOfWeek = DAYS_OF_WEEK[dayIndex];
                        updatedTasks.push(t);
                        dateCursor.setDate(dateCursor.getDate() + 1);
                    });
                });
            }

            const today = new Date();
            const todayStr = getLocalDateStr(today);

            const updatedPlan = {
                ...currentPlan,
                startDate: todayStr,
                tasks: updatedTasks,
                originalTasks: sourceTasks,
                xp: 0
            };

            try {
                await MentorshipStorage.savePlan(updatedPlan);
                setCurrentPlan(updatedPlan);
                showAlert("Sucesso", "Plano reiniciado com sucesso! O Dia 1 agora é HOJE.");
            } catch (error) {
                console.error("Erro ao salvar plano:", error);
                showAlert("Erro", "Erro ao salvar o plano.");
            }
        } catch (outerError) {
            console.error("Erro geral no reset:", outerError);
            showAlert("Erro", "Erro ao processar o reset do plano.");
        }
    });
  };

  const handleWipePlan = async () => {
    if (!currentPlan) return;
    
    showConfirm("Zerar Plano Tático", "ATENÇÃO: Isso EXCLUIRÁ PERMANENTEMENTE todas as missões e mensagens do plano. O aluno ficará sem cronograma. Confirmar destruição total?", async () => {
        try {
            const updatedPlan = {
                ...currentPlan,
                tasks: [],
                messages: [],
                startDate: new Date().toISOString().split('T')[0]
            };

            try {
                await MentorshipStorage.savePlan(updatedPlan);
                setCurrentPlan(updatedPlan);
                showAlert("Plano Zerado", "Todas as missões foram excluídas. O campo de batalha está limpo.");
            } catch (error) {
                console.error("Erro ao zerar plano:", error);
                showAlert("Erro", "Falha ao zerar o plano.");
            }
        } catch (error) {
            console.error("Erro geral ao zerar plano:", error);
            showAlert("Erro", "Erro ao processar o zeramento do plano.");
        }
    });
  };

  const handleReplan = async () => {
    if (!currentPlan) return;
    
    showConfirm("Redistribuir Tarefas", "Isso irá redistribuir todas as tarefas pendentes (atrasadas e futuras) uniformemente até a data final original do plano. Continuar?", async () => {
        const today = new Date();
        
        // Data final original
        const dates = currentPlan.tasks.map(t => t.date).filter(d => d).sort();
        const lastDateStr = dates[dates.length - 1];
        if (!lastDateStr) return showAlert("Erro", "Plano sem datas definidas.");

        const [ly, lm, ld] = lastDateStr.split('-').map(Number);
        let endDate = new Date(ly, lm - 1, ld);
        
        // Se o plano acaba hoje ou antes, estende por 7 dias
        if (endDate <= today) {
            endDate = new Date(today);
            endDate.setDate(today.getDate() + 7);
            showAlert("Aviso", "O plano original já expirou. O prazo foi estendido em 7 dias.");
        }

        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir hoje

        const pendingTasks = currentPlan.tasks.filter(t => !t.isCompleted);
        const completedTasks = currentPlan.tasks.filter(t => t.isCompleted);

        // Redistribuir pendingTasks
        const tasksPerDay = Math.ceil(pendingTasks.length / daysRemaining);

        let currentDayIndex = 0;
        let tasksInCurrentDay = 0;

        const redistributedTasks = pendingTasks.map(t => {
            const taskDate = new Date(today);
            taskDate.setDate(today.getDate() + currentDayIndex);
            
            const dayIndex = taskDate.getDay() === 0 ? 6 : taskDate.getDay() - 1;
            const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];

            tasksInCurrentDay++;
            if (tasksInCurrentDay >= tasksPerDay) {
                currentDayIndex++;
                tasksInCurrentDay = 0;
            }

            return {
                ...t,
                date: getLocalDateStr(taskDate),
                dayOfWeek: dayName
            };
        });

        const finalTasks = [...completedTasks, ...redistributedTasks];
        finalTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        const updatedPlan = {
            ...currentPlan,
            tasks: finalTasks
        };

        try {
            await MentorshipStorage.savePlan(updatedPlan);
            setCurrentPlan(updatedPlan);
            showAlert("Sucesso", `Replanejamento concluído! Nova densidade: ~${tasksPerDay} tarefas/dia.`);
        } catch (err) {
            console.error("Erro ao replanejar:", err);
            showAlert("Erro", "Erro ao replanejar o plano.");
        }
    });
  };

  // Aplicação Final ao Aluno
  const handleUpdateFullPlanTask = (taskId: string, field: keyof MentorshipTask, value: any) => {
    if (!currentPlan) return;
    
    const updatedTasks = currentPlan.tasks.map(t => {
        if (t.id === taskId) {
            const updated = { ...t, [field]: value };
            
            // Se mudar a data, atualiza o dia da semana automaticamente
            if (field === 'date' && value) {
                const [y, m, d] = value.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                if (!isNaN(dateObj.getTime())) {
                    const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
                    updated.dayOfWeek = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
                }
            }
            
            return updated;
        }
        return t;
    });
    
    setCurrentPlan({ ...currentPlan, tasks: updatedTasks });
  };

  const saveFullPlanChanges = async () => {
    if (!currentPlan) return;
    setLoading(true);
    try {
        // Ao salvar alterações manuais, atualizamos também o originalTasks para que o novo layout seja o "template"
        const updatedPlan = {
            ...currentPlan,
            originalTasks: currentPlan.tasks
        };
        await MentorshipStorage.savePlan(updatedPlan);
        setCurrentPlan(updatedPlan);
        showAlert("Sucesso", "Alterações no plano salvas com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar plano completo:", err);
        showAlert("Erro", "Não foi possível salvar as alterações.");
    } finally {
        setLoading(true);
        // Recarregar plano para garantir consistência
        const student = premiumStudents.find(s => s.id === selectedStudentId);
        if (student) {
            const plan = await MentorshipStorage.initPlan(student.id, student.name);
            setCurrentPlan(plan);
        }
        setLoading(false);
    }
  };

  const handleApplyFinalPlan = () => {
      if (!currentPlan) return;
      setShowDeployModal(true);
  };

  const confirmDeployPlan = async () => {
      if (!currentPlan) return;
      
      try {
          // 1. Converte itens da IA em Tasks
          const aiTasks: MentorshipTask[] = generatedItems.map(item => {
              // Correção de Data: Criar data ao meio-dia para evitar problemas de fuso horário UTC
              const [year, month, day] = startDatePlanner.split('-').map(Number);
              const date = new Date(year, month - 1, day); // Local time
              date.setDate(date.getDate() + item.dayOffset); // dayOffset 0 é o primeiro dia
              
              const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
              const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
              const dateStr = getLocalDateStr(date);

              return {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  dayOfWeek: dayName,
                  type: item.type,
                  subject: item.subject,
                  description: `${item.topic} - ${item.instructions}`,
                  isCompleted: false,
                  date: dateStr
              };
          });

          // 2. Gera Tasks das Metas Extras
          const maxDayOffset = generatedItems.reduce((max, item) => Math.max(max, item.dayOffset), 0);
          const extraTasks: MentorshipTask[] = [];
          
          for (let i = 0; i <= maxDayOffset; i++) {
              const [year, month, day] = startDatePlanner.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              date.setDate(date.getDate() + i);
              
              const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
              const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
              const dateStr = getLocalDateStr(date);

              extraGoals.forEach(goal => {
                  let shouldAdd = false;
                  if (goal.frequency === 'DAILY') shouldAdd = true;
                  else if (goal.frequency === 'CUSTOM' && goal.selectedDays.includes(dayName)) shouldAdd = true;

                  if (shouldAdd) {
                      extraTasks.push({
                          id: `extra-${Date.now()}-${Math.random()}`,
                          dayOfWeek: dayName,
                          type: goal.type,
                          subject: goal.title, // Ex: TAF, Meditação
                          description: goal.description || "Meta Extra Recorrente",
                          isCompleted: false,
                          date: dateStr
                      });
                  }
              });
          }

          const newTasks = [...currentPlan.tasks, ...aiTasks, ...extraTasks];
          const updatedPlan = {
              ...currentPlan,
              tasks: newTasks,
              originalTasks: newTasks,
              weeklySchedule: weeklySchedule, // Salva o cronograma semanal para resets futuros
              xp: currentPlan.xp || 0
          };

          try {
              await MentorshipStorage.savePlan(updatedPlan);
              setCurrentPlan(updatedPlan);
              
              // Reset
              setPlannerStep('INPUT');
              setGeneratedItems([]);
              setExtraGoals([]);
              setActiveMode('DAILY');
              setShowDeployModal(false);
              showAlert("Sucesso", "Plano de Guerra implantado com sucesso! O cronograma foi atualizado.");
          } catch (err) {
              console.error(err);
              showAlert("Erro Crítico", "Erro crítico ao salvar o plano. Tente novamente.");
          }
      } catch (err) {
          console.error(err);
          showAlert("Erro Crítico", "Erro crítico ao processar o plano.");
      }
  };

  if (!premiumPlan) return <div className="bg-[#09090b] text-zinc-500 p-8 min-h-[50vh] border border-zinc-900 rounded-xl flex items-center justify-center"><p>Crie um plano "MENTORIA PREMIUM" na aba Gestão de Planos.</p></div>;
  if (premiumStudents.length === 0) return <div className="bg-[#09090b] text-zinc-500 p-8 min-h-[50vh] border border-zinc-900 rounded-xl flex items-center justify-center"><p>Nenhum aluno cadastrado no plano MENTORIA PREMIUM.</p></div>;
  
  return (
    <div className="bg-[#09090b] text-zinc-200 p-6 min-h-screen font-sans border border-zinc-900 rounded-xl">
      <header className="mb-8 border-b border-zinc-800 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h1 className="text-2xl font-black text-white uppercase tracking-tighter">Comando de <span className="text-red-600">Mentoria</span></h1><p className="text-zinc-500 text-sm">Painel de Controle Individual</p></div>
        <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button onClick={() => setActiveMode('DAILY')} className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeMode === 'DAILY' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><List size={14}/> Diário</button>
                <button onClick={() => setActiveMode('FULL_EDIT')} className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeMode === 'FULL_EDIT' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Edit2 size={14}/> Editar Plano</button>
                <button onClick={() => setActiveMode('PLANNER')} className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeMode === 'PLANNER' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'text-zinc-500 hover:text-zinc-300'}`}><Brain size={14}/> Gerador IA 2.0</button>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800"><span className="text-xs font-bold text-zinc-400 uppercase mr-2">Operador:</span><select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 outline-none focus:border-red-600">{premiumStudents.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
        </div>
      </header>

      {loading && <div className="text-zinc-500 text-center py-12">Carregando dados táticos do aluno...</div>}

      {/* --- MODO: PLANNER IA 2.0 --- */}
      {!loading && currentPlan && activeMode === 'PLANNER' && (
          <div className="animate-fade-in">
              
              {/* STEP 1: INPUT */}
              {plannerStep === 'INPUT' && (
                  <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 max-w-3xl mx-auto">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                          <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                              <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                              Inteligência do Edital
                          </h3>
                          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                              <button 
                                  onClick={() => setPlannerInputMode('NEW')}
                                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition ${plannerInputMode === 'NEW' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                  Novo Edital
                              </button>
                              <button 
                                  onClick={() => setPlannerInputMode('SAVED')}
                                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition ${plannerInputMode === 'SAVED' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                  Modelos Salvos
                              </button>
                          </div>
                      </div>

                      {plannerInputMode === 'NEW' ? (
                          <div className="animate-fade-in">
                              <p className="text-zinc-400 text-xs mb-4">Cole abaixo o conteúdo programático bruto. A IA irá estruturar as matérias.</p>
                              <textarea 
                                  value={rawEdital} 
                                  onChange={e => setRawEdital(e.target.value)} 
                                  placeholder="Cole aqui o texto do edital..." 
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white h-64 outline-none focus:border-red-600 font-mono text-xs mb-4"
                              />
                              <button 
                                  onClick={handleAnalyzeEdital} 
                                  disabled={isAnalyzing}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                              >
                                  {isAnalyzing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Brain size={18}/>}
                                  {isAnalyzing ? "Processando Inteligência..." : "Analisar e Estruturar"}
                              </button>
                          </div>
                      ) : (
                          <div className="animate-fade-in space-y-3">
                              {savedStudyPlans.length === 0 ? (
                                  <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                                      <p className="text-zinc-500 text-sm">Nenhum modelo de plano salvo encontrado.</p>
                                  </div>
                              ) : (
                                  savedStudyPlans.map(plan => (
                                      <div key={plan.id} className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors group">
                                          <div>
                                              <p className="text-sm text-white font-bold group-hover:text-red-500 transition-colors">{plan.title}</p>
                                              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">
                                                  {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Data desconhecida'} • {plan.items?.length || 0} matérias
                                              </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <button 
                                                  onClick={() => {
                                                      setDetectedStructure(plan.items || []);
                                                      setSubjectConfigs(plan.subjectConfigs || {});
                                                      setWeeklySchedule(plan.weeklySchedule || {});
                                                      setExtraGoals(plan.extraGoals || []);
                                                      
                                                      if (plan.generatedTasks && plan.generatedTasks.length > 0) {
                                                          setGeneratedItems(plan.generatedTasks);
                                                          setPlannerStep('PREVIEW');
                                                      } else {
                                                          setPlannerStep('CONFIG');
                                                      }
                                                  }}
                                                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
                                              >
                                                  <Zap size={14} className="text-yellow-500" /> Carregar
                                              </button>
                                              <button 
                                                  onClick={async () => {
                                                      if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
                                                          await globalRepo.deleteStudyPlan(plan.id);
                                                          setSavedStudyPlans(prev => prev.filter(p => p.id !== plan.id));
                                                      }
                                                  }}
                                                  className="bg-zinc-900 hover:bg-red-900/40 text-zinc-500 hover:text-red-500 p-2 rounded-lg transition-all"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}
                  </div>
              )}

              {/* STEP 2: CONFIGURAÇÃO */}
              {plannerStep === 'CONFIG' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                          {/* LISTA DE MATÉRIAS DETECTADAS */}
                          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                              <div className="flex justify-between items-center mb-6">
                                  <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                                      <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                      Estratégia de Combate
                                  </h3>
                                  <button onClick={handleExportToGlobalEdital} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded border border-zinc-700 flex items-center gap-1">
                                      <Save size={12}/> Salvar como Edital Global
                                  </button>
                                  <button onClick={() => setShowSavePlanModal(true)} className="text-xs bg-green-800 hover:bg-green-700 text-white px-3 py-1 rounded border border-green-700 flex items-center gap-1">
                                      <Save size={12}/> Salvar Plano de Estudo
                                  </button>
                              </div>
                              
                              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                  {detectedStructure.map((subj, idx) => (
                                      <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-white font-bold">{subj.name}</span>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-zinc-500">{subj.topics.length} tópicos</span>
                                                  <button
                                                      onClick={() => {
                                                          setEditingSubjectIndex(idx);
                                                          setEditingSubjectName(subj.name);
                                                          setEditingSubjectTopics(subj.topics.join('\n'));
                                                      }}
                                                      className="text-zinc-400 hover:text-blue-500 transition-colors"
                                                      title="Editar Matéria"
                                                  >
                                                      <Edit2 size={14} />
                                                  </button>
                                                  <button
                                                      onClick={() => {
                                                          if (confirm(`Tem certeza que deseja remover a matéria ${subj.name}?`)) {
                                                              setDetectedStructure(prev => prev.filter((_, i) => i !== idx));
                                                              setSubjectConfigs(prev => {
                                                                  const newConfigs = { ...prev };
                                                                  delete newConfigs[subj.name];
                                                                  return newConfigs;
                                                              });
                                                          }
                                                      }}
                                                      className="text-zinc-400 hover:text-red-500 transition-colors"
                                                      title="Remover Matéria"
                                                  >
                                                      <Trash2 size={14} />
                                                  </button>
                                              </div>
                                          </div>
                                          
                                          {/* CONFIGS DA MATÉRIA */}
                                          <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                  <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Peso no Edital (1-3)</label>
                                                  <input 
                                                      type="range" min="1" max="3" step="1"
                                                      value={(subjectConfigs[subj.name] as SubjectConfig)?.weight || 2}
                                                      onChange={e => setSubjectConfigs(prev => {
                                                          const curr = prev[subj.name] as SubjectConfig | undefined;
                                                          const safe = curr || { weight: 2, difficulty: 2 };
                                                          return { ...prev, [subj.name]: { ...safe, weight: Number(e.target.value) } };
                                                      })}
                                                      className="w-full accent-red-600"
                                                  />
                                                  <div className="flex justify-between text-[10px] text-zinc-600"><span>Baixo</span><span>Médio</span><span>Alto</span></div>
                                              </div>
                                              <div>
                                                  <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Dificuldade do Aluno (1-3)</label>
                                                  <input 
                                                      type="range" min="1" max="3" step="1"
                                                      value={(subjectConfigs[subj.name] as SubjectConfig)?.difficulty || 2}
                                                      onChange={e => setSubjectConfigs(prev => {
                                                          const curr = prev[subj.name] as SubjectConfig | undefined;
                                                          const safe = curr || { weight: 2, difficulty: 2 };
                                                          return { ...prev, [subj.name]: { ...safe, difficulty: Number(e.target.value) } };
                                                      })}
                                                      className="w-full accent-blue-600"
                                                  />
                                                  <div className="flex justify-between text-[10px] text-zinc-600"><span>Fácil</span><span>Média</span><span>Difícil</span></div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <button
                                  onClick={() => {
                                      setEditingSubjectIndex(-1);
                                      setEditingSubjectName("");
                                      setEditingSubjectTopics("");
                                  }}
                                  className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                              >
                                  <Plus size={16} /> Adicionar Matéria
                              </button>
                          </div>
                      </div>

                      {/* QUADRO HORÁRIO SEMANAL */}
                      <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 lg:col-span-2">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                              <div>
                                  <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                                      <Calendar size={16} className="text-blue-500"/>
                                      Quadro Horário Semanal
                                  </h3>
                                  <p className="text-xs text-zinc-500 mt-1">Selecione as matérias para cada dia. A IA irá gerar 1 meta por matéria selecionada.</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                              {DAYS_OF_WEEK.map(day => (
                                  <div key={day} className="bg-zinc-950 p-3 rounded border border-zinc-800">
                                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
                                          <span className="text-sm font-bold text-white uppercase">{day}</span>
                                          {day !== 'Domingo' && (
                                              <div className="flex gap-2">
                                                  <button 
                                                      onClick={() => setWeeklySchedule(prev => ({ ...prev, [day]: detectedStructure.map(s => s.name) }))}
                                                      className="text-[10px] text-zinc-500 hover:text-white"
                                                  >
                                                      Todos
                                                  </button>
                                                  <button 
                                                      onClick={() => setWeeklySchedule(prev => ({ ...prev, [day]: [] }))}
                                                      className="text-[10px] text-zinc-500 hover:text-white"
                                                  >
                                                      Nenhum
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                      
                                      {day === 'Domingo' ? (
                                          <div className="text-xs text-zinc-500 italic text-center py-2">
                                              Simulado e Redação (Fixo)
                                          </div>
                                      ) : (
                                          <div className="flex flex-wrap gap-1.5">
                                              {detectedStructure.map(subj => {
                                                  const isSelected = weeklySchedule[day]?.includes(subj.name);
                                                  return (
                                                      <button
                                                          key={subj.name}
                                                          onClick={() => {
                                                              setWeeklySchedule(prev => {
                                                                  const current = prev[day] || [];
                                                                  const updated = current.includes(subj.name)
                                                                      ? current.filter(s => s !== subj.name)
                                                                      : [...current, subj.name];
                                                                  return { ...prev, [day]: updated };
                                                              });
                                                          }}
                                                          className={`text-[10px] px-2 py-1 rounded border transition-all ${
                                                              isSelected 
                                                                  ? 'bg-blue-900/30 text-blue-400 border-blue-900' 
                                                                  : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700'
                                                          }`}
                                                      >
                                                          {subj.name}
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* SIDEBAR DE CONFIGURAÇÃO GERAL */}
                      <div className="space-y-6">
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                              <h4 className="text-white font-bold mb-4 text-sm uppercase">Parâmetros Gerais</h4>
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs text-zinc-500 font-bold uppercase">Data de Início</label>
                                      <input type="date" value={startDatePlanner} onChange={e => setStartDatePlanner(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white mt-1"/>
                                  </div>
                                  {/* DURAÇÃO REMOVIDA - IA CALCULA */}
                                  <div className="grid grid-cols-2 gap-2">
                                      <div>
                                          <label className="text-xs text-zinc-500 font-bold uppercase">Horas/Dia</label>
                                          <input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white mt-1"/>
                                      </div>
                                      <div>
                                          <label className="text-xs text-zinc-500 font-bold uppercase">Matérias/Dia</label>
                                          <input type="number" value={subjectsPerDay} onChange={e => setSubjectsPerDay(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white mt-1"/>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                      <input type="checkbox" checked={includeLeiSeca} onChange={e => setIncludeLeiSeca(e.target.checked)} className="w-4 h-4 accent-red-600"/>
                                      <span className="text-sm text-white">Incluir Lei Seca</span>
                                  </div>
                              </div>
                              <button 
                                  onClick={handleGenerateSchedule}
                                  disabled={isGenerating}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-6 flex items-center justify-center gap-2 transition disabled:opacity-50"
                              >
                                  {isGenerating ? (
                                      <div className="flex items-center gap-2">
                                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                          <span>Calculando Rota...</span>
                                      </div>
                                  ) : (
                                      <>Gerar Cronograma <Zap size={16}/></>
                                  )}
                              </button>
                              <button onClick={() => setPlannerStep('INPUT')} className="w-full text-zinc-500 text-xs mt-2 underline">Voltar</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* STEP 3: PREVIEW & EXTRAS */}
              {plannerStep === 'PREVIEW' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* PREVIEW DO CRONOGRAMA */}
                      <div className="lg:col-span-2 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex flex-col h-[600px]">
                          <div className="flex justify-between items-center mb-4">
                              <div>
                                <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                                    <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                    Visualização Tática
                                </h3>
                                {/* DATA DE TÉRMINO CALCULADA - DESTAQUE MÁXIMO */}
                                <div className="mt-2 flex items-center gap-2 bg-zinc-950 border border-zinc-700 px-3 py-1 rounded">
                                    <Calendar size={14} className="text-red-500"/>
                                    <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-wider">
                                        Previsão de Término: <span className="text-red-500 text-sm">{calculatedEndDate}</span>
                                    </p>
                                </div>
                              </div>
                              <span className="bg-green-900/20 text-green-500 text-xs font-bold px-2 py-1 rounded border border-green-900">{generatedItems.length} Missões</span>
                          </div>
                          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-y-auto p-4 custom-scrollbar space-y-2">
                              {generatedItems.map((item, idx) => (
                                  <div key={idx} className="flex gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded hover:border-zinc-700">
                                      <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-500">D{item.dayOffset}</div>
                                      <div className="flex-1">
                                          <div className="flex justify-between">
                                              <span className="text-white text-sm font-bold">{item.subject}</span>
                                              <span className="text-[10px] bg-red-900/20 text-red-400 px-1 rounded">{item.type}</span>
                                          </div>
                                          <p className="text-xs text-zinc-400 mt-1">{item.topic}</p>
                                          <p className="text-[10px] text-zinc-600 mt-1 italic">{item.instructions}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* SIDEBAR: METAS EXTRAS & CONFIRMAÇÃO */}
                      <div className="space-y-6">
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="text-white font-bold text-sm uppercase">Metas Extras (Rotina)</h4>
                                  <button onClick={() => setShowExtraGoalForm(true)} className="text-blue-500 hover:text-white"><Plus size={18}/></button>
                              </div>
                              
                              {/* Lista de Extras */}
                              <div className="space-y-2 mb-4">
                                  {extraGoals.map((goal, idx) => (
                                      <div key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-800 flex justify-between items-center">
                                          <div>
                                              <p className="text-white text-xs font-bold">{goal.title}</p>
                                              <p className="text-[10px] text-zinc-500">{goal.frequency === 'DAILY' ? 'Todo dia' : goal.selectedDays.join(', ')}</p>
                                          </div>
                                          <button onClick={() => setExtraGoals(extraGoals.filter((_, i) => i !== idx))} className="text-red-500"><X size={14}/></button>
                                      </div>
                                  ))}
                                  {extraGoals.length === 0 && <p className="text-zinc-600 text-xs italic">Nenhuma meta extra adicionada.</p>}
                              </div>

                              {/* Form Add Extra */}
                              {showExtraGoalForm && (
                                  <div className="bg-zinc-950 p-3 rounded border border-zinc-700 mb-4 animate-fade-in">
                                      <input value={newExtraGoal.title} onChange={e => setNewExtraGoal({...newExtraGoal, title: e.target.value})} placeholder="Título (ex: TAF)" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white mb-2"/>
                                      <select value={newExtraGoal.type} onChange={e => setNewExtraGoal({...newExtraGoal, type: e.target.value as TaskType})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white mb-2">
                                          <option value="META_EXTRA">Meta Extra</option>
                                          {TASK_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                                      </select>
                                      <div className="flex gap-2 mb-2">
                                          <button onClick={() => setNewExtraGoal({...newExtraGoal, frequency: 'DAILY'})} className={`flex-1 text-xs py-1 rounded border ${newExtraGoal.frequency === 'DAILY' ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>Diário</button>
                                          <button onClick={() => setNewExtraGoal({...newExtraGoal, frequency: 'CUSTOM'})} className={`flex-1 text-xs py-1 rounded border ${newExtraGoal.frequency === 'CUSTOM' ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>Dias</button>
                                      </div>
                                      {newExtraGoal.frequency === 'CUSTOM' && (
                                          <div className="flex flex-wrap gap-1 mb-2">
                                              {DAYS_OF_WEEK.map(day => (
                                                  <button key={day} onClick={() => {
                                                      const days = newExtraGoal.selectedDays.includes(day) ? newExtraGoal.selectedDays.filter(d => d !== day) : [...newExtraGoal.selectedDays, day];
                                                      setNewExtraGoal({...newExtraGoal, selectedDays: days});
                                                  }} className={`text-[10px] px-2 py-1 rounded ${newExtraGoal.selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{day.substring(0,3)}</button>
                                              ))}
                                          </div>
                                      )}
                                      <button onClick={handleAddExtraGoal} className="w-full bg-green-600 text-white text-xs font-bold py-1 rounded">Adicionar</button>
                                  </div>
                              )}

                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => setShowSavePlanModal(true)}
                                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg border border-zinc-700"
                                  >
                                      <Save size={18}/> Salvar como Modelo
                                  </button>
                                  <button 
                                      onClick={handleApplyFinalPlan}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                                  >
                                      <Zap size={18}/> Implantar Plano ao Aluno
                                  </button>
                              </div>
                              <button onClick={() => setPlannerStep('CONFIG')} className="w-full text-zinc-500 text-xs mt-2 underline text-center">Voltar Config</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {!loading && currentPlan && activeMode === 'FULL_EDIT' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">Edição Direta do Plano</h3>
                          <p className="text-zinc-500 text-sm">Altere matérias, datas e tipos de missão manualmente.</p>
                      </div>
                      <button 
                          onClick={saveFullPlanChanges}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg w-full md:w-auto justify-center"
                      >
                          <Save size={18} /> SALVAR ALTERAÇÕES
                      </button>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                              <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">
                                  <th className="py-3 px-4">Data</th>
                                  <th className="py-3 px-4">Dia</th>
                                  <th className="py-3 px-4">Matéria</th>
                                  <th className="py-3 px-4">Tipo</th>
                                  <th className="py-3 px-4">Descrição</th>
                                  <th className="py-3 px-4 text-center">Status</th>
                                  <th className="py-3 px-4 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                              {[...currentPlan.tasks].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(task => (
                                  <tr key={task.id} className="hover:bg-zinc-800/30 transition-colors group">
                                      <td className="py-2 px-4">
                                          <input 
                                              type="date" 
                                              value={task.date || ''} 
                                              onChange={(e) => handleUpdateFullPlanTask(task.id, 'date', e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 text-white text-xs p-1.5 rounded focus:border-red-600 outline-none"
                                          />
                                      </td>
                                      <td className="py-2 px-4 text-[10px] text-zinc-400 font-mono uppercase">{task.dayOfWeek?.substring(0,3)}</td>
                                      <td className="py-2 px-4">
                                          <input 
                                              type="text" 
                                              value={task.subject} 
                                              onChange={(e) => handleUpdateFullPlanTask(task.id, 'subject', e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 text-white text-xs p-1.5 rounded w-full focus:border-red-600 outline-none"
                                          />
                                      </td>
                                      <td className="py-2 px-4">
                                          <select 
                                              value={task.type} 
                                              onChange={(e) => handleUpdateFullPlanTask(task.id, 'type', e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 text-white text-xs p-1.5 rounded focus:border-red-600 outline-none w-full"
                                          >
                                              {TASK_TYPES.map(tt => (
                                                  <option key={tt.type} value={tt.type}>{tt.label}</option>
                                              ))}
                                          </select>
                                      </td>
                                      <td className="py-2 px-4">
                                          <input 
                                              type="text" 
                                              value={task.description || ''} 
                                              onChange={(e) => handleUpdateFullPlanTask(task.id, 'description', e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 text-white text-xs p-1.5 rounded w-full focus:border-red-600 outline-none"
                                          />
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${task.isCompleted ? 'bg-green-900/30 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                              {task.isCompleted ? 'OK' : 'PEND'}
                                          </span>
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                          <button 
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="text-zinc-600 hover:text-red-500 p-1.5 transition-colors"
                                              title="Excluir Missão"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </td>
                                  </tr>
                                ))}
                          </tbody>
                      </table>
                  </div>
                  
                  {currentPlan.tasks.length === 0 && (
                      <div className="py-20 text-center text-zinc-600 italic">
                          Nenhuma missão encontrada para este plano.
                      </div>
                  )}
              </div>
          </div>
      )}

      {!loading && currentPlan && activeMode === 'DAILY' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        {/* Lado Esquerdo - Mantido igual ao original (Mensagens/Tasks manuais) */}
        <div className="space-y-8">
          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm tracking-wide"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>Ordem do Dia (Mensagem Prioritária)</h3>
            <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escreva a orientação estratégica para hoje..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white h-32 outline-none focus:border-red-600 mb-4 resize-none"/>
            <button onClick={handleSendMessage} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"><Icon name="send" /> Transmitir Ordem</button>
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wide">Adicionar Missão Manualmente</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Dia da Semana</label><select value={taskDay} onChange={e => setTaskDay(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1">{DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Tipo de Missão</label><select value={taskType} onChange={e => setTaskType(e.target.value as TaskType)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1">{TASK_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}</select></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Matéria / Tópico</label><input type="text" value={taskSubject} onChange={e => setTaskSubject(e.target.value)} placeholder="Ex: Direito Penal - Art. 121" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Detalhes (Opcional)</label><input type="text" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Ex: Ler PDF pág. 10 a 30" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Repetir por (Semanas)</label><input type="number" min="1" max="52" value={taskWeeks} onChange={e => setTaskWeeks(parseInt(e.target.value) || 1)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <button onClick={handleAddTask} className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 mt-2 transition-all"><Icon name="plus" /> Adicionar ao Plano</button>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wide">Meta Específica (Data Única)</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Data</label><input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Tipo</label><select value={specificType} onChange={e => setSpecificType(e.target.value as TaskType)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1">{TASK_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}</select></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Matéria / Tópico</label><input type="text" value={specificSubject} onChange={e => setSpecificSubject(e.target.value)} placeholder="Ex: Direito Penal - Art. 121" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <div><label className="text-xs text-zinc-500 font-bold uppercase">Detalhes (Opcional)</label><input type="text" value={specificDesc} onChange={e => setSpecificDesc(e.target.value)} placeholder="Ex: Ler PDF pág. 10 a 30" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white mt-1" /></div>
              <button onClick={handleAddSpecificTask} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 mt-2 transition-all"><Icon name="plus" /> Adicionar Meta Única</button>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wide flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500"/> Gestão de Crise
            </h3>
            <div className="space-y-3">
                <button onClick={handleReplan} className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-600/50 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs uppercase">
                    <Scale size={14}/> Replanejar Atrasos (Manter Prazo)
                </button>
                <button onClick={handleResetPlan} className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/50 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs uppercase">
                    <Trash2 size={14}/> Resetar Plano (Reiniciar Hoje)
                </button>
                <button onClick={handleWipePlan} className="w-full bg-red-950/40 hover:bg-red-900/50 text-red-700 border border-red-900/50 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs uppercase">
                    <Trash2 size={14}/> Zerar Plano (Excluir Tudo)
                </button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
             <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center"><h3 className="font-bold text-white uppercase text-sm tracking-wide">Cronograma Tático Semanal</h3><span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">Visualização de Comando</span></div>
             <div className="divide-y divide-zinc-800">{DAYS_OF_WEEK.map(day => { const dayTasks = currentPlan.tasks.filter(t => t.dayOfWeek === day); return (<div key={day} className="flex flex-col md:flex-row md:items-start p-4 hover:bg-zinc-900/50 transition-colors"><div className="w-24 flex-shrink-0 mb-2 md:mb-0"><span className={`text-sm font-bold uppercase tracking-wider ${dayTasks.length > 0 ? 'text-white' : 'text-zinc-600'}`}>{day.substring(0, 3)}</span></div><div className="flex-1 space-y-2">{dayTasks.length === 0 && <span className="text-xs text-zinc-700 italic">Sem missões</span>}{dayTasks.map(task => { const typeInfo = TASK_TYPES.find(t => t.type === task.type); return (<div key={task.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2 rounded group hover:border-zinc-600 transition-colors"><div className="flex items-center gap-3"><div className={`w-2 h-8 rounded ${typeInfo?.color || 'bg-gray-500'}`}></div><div><p className="text-sm font-bold text-zinc-200">{task.subject}</p><p className="text-xs text-zinc-500">{typeInfo?.label} {task.description && `• ${task.description}`}</p></div></div><div className="flex items-center gap-1"><button onClick={() => handleEditTask(task)} className="p-2 text-zinc-600 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button onClick={() => handleDeleteTask(task.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Icon name="trash" /></button></div></div>); })}</div></div>); })}</div>
          </div>
        </div>
      </div>
      )}
      
      {/* MODAL EDITAR TAREFA */}
      {editingTask && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">Editar Missão</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Dia da Semana</label>
                          <select 
                              value={editTaskForm.dayOfWeek}
                              onChange={(e) => setEditTaskForm({...editTaskForm, dayOfWeek: e.target.value})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          >
                              {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                          <select 
                              value={editTaskForm.type}
                              onChange={(e) => setEditTaskForm({...editTaskForm, type: e.target.value as TaskType})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          >
                              {TASK_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Matéria</label>
                          <input 
                              type="text" 
                              value={editTaskForm.subject}
                              onChange={(e) => setEditTaskForm({...editTaskForm, subject: e.target.value})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Instruções / Tópico</label>
                          <textarea 
                              value={editTaskForm.description}
                              onChange={(e) => setEditTaskForm({...editTaskForm, description: e.target.value})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-600 transition-colors min-h-[100px]"
                          />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button 
                          onClick={() => setEditingTask(null)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700"
                      >
                          CANCELAR
                      </button>
                      <button 
                          onClick={handleSaveEditTask}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
                      >
                          SALVAR
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL SALVAR PLANO DE ESTUDO */}
      {showSavePlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  <div className="text-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Salvar Plano de Estudo</h3>
                      <p className="text-zinc-400 text-xs">Este plano ficará salvo para reutilização em outros alunos.</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Nome do Plano</label>
                          <input 
                              type="text" 
                              value={planTitle} 
                              onChange={(e) => setPlanTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-green-600"
                              placeholder="Ex: Plano PM-SP 2026"
                              autoFocus
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setShowSavePlanModal(false)}
                              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={async () => {
                                  if (!planTitle.trim()) return showAlert("Atenção", "Digite um nome para o plano.");
                                  try {
                                      const newPlan: StudyPlan = {
                                          id: `study-plan-${Date.now()}`,
                                          title: planTitle,
                                          items: detectedStructure,
                                          generatedTasks: generatedItems,
                                          weeklySchedule: weeklySchedule,
                                          subjectConfigs: subjectConfigs,
                                          extraGoals: extraGoals,
                                          createdAt: new Date().toISOString()
                                      };
                                      await globalRepo.saveStudyPlan(newPlan);
                                      setSavedStudyPlans(prev => [newPlan, ...prev]);
                                      setShowSavePlanModal(false);
                                      showAlert("Sucesso", "Plano de estudo salvo com sucesso!");
                                  } catch (err) {
                                      console.error(err);
                                      showAlert("Erro", "Erro ao salvar plano de estudo.");
                                  }
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                          >
                              <Save size={18} /> Salvar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* MODAL EDITAR MATÉRIA */}
      {editingSubjectIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">
                      {editingSubjectIndex === -1 ? "Adicionar Matéria" : "Editar Matéria"}
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Nome da Matéria</label>
                          <input 
                              type="text" 
                              value={editingSubjectName} 
                              onChange={(e) => setEditingSubjectName(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-blue-600"
                              placeholder="Ex: Português"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Tópicos (um por linha)</label>
                          <textarea 
                              value={editingSubjectTopics} 
                              onChange={(e) => setEditingSubjectTopics(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-blue-600 min-h-[200px] custom-scrollbar"
                              placeholder="Ex: Ortografia&#10;Sintaxe&#10;Morfologia"
                          />
                      </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                      <button 
                          onClick={() => setEditingSubjectIndex(null)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={() => {
                              if (!editingSubjectName.trim()) return showAlert("Atenção", "O nome da matéria é obrigatório.");
                              const topics = editingSubjectTopics.split('\n').map(t => t.trim()).filter(t => t);
                              if (topics.length === 0) return showAlert("Atenção", "Adicione pelo menos um tópico.");
                              
                              setDetectedStructure(prev => {
                                  const newStructure = [...prev];
                                  if (editingSubjectIndex === -1) {
                                      newStructure.push({ name: editingSubjectName, topics });
                                  } else {
                                      newStructure[editingSubjectIndex] = { name: editingSubjectName, topics };
                                  }
                                  return newStructure;
                              });
                              setEditingSubjectIndex(null);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 shadow-lg"
                      >
                          Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL SALVAR EDITAL */}
      {showSaveEditalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  <div className="text-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Salvar Edital Global</h3>
                      <p className="text-zinc-400 text-xs">Este edital ficará disponível para todos os alunos na aba 'Gestão de Editais'.</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Nome do Edital</label>
                          <input 
                              type="text" 
                              value={editalTitle} 
                              onChange={(e) => setEditalTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-blue-600"
                              placeholder="Ex: Edital Verticalizado PM-SP 2026"
                              autoFocus
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setShowSaveEditalModal(false)}
                              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={confirmSaveEdital}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                          >
                              <Save size={18} /> Salvar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {/* MODAL IMPLANTAR PLANO */}
      {showDeployModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-green-600 shadow-lg">
                          <Zap size={24} fill="currentColor"/>
                      </div>
                  </div>

                  <div className="text-center mb-6 mt-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Implantar Plano de Guerra</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                          Você está prestes a adicionar <span className="text-white font-bold">{generatedItems.length} novas missões</span> ao calendário do aluno.
                          <br/><br/>
                          <span className="block bg-zinc-950 p-2 rounded border border-zinc-800 text-xs font-mono text-zinc-400">
                              Término Previsto: <span className="text-red-500 font-bold">{calculatedEndDate}</span>
                          </span>
                      </p>
                  </div>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={confirmDeployPlan}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                      >
                          <Check size={20} /> CONFIRMAR IMPLANTAÇÃO
                      </button>

                      <button 
                          onClick={() => setShowDeployModal(false)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700"
                      >
                          CANCELAR OPERAÇÃO
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      <Dialog
        isOpen={dialog?.isOpen || false}
        type={dialog?.type || 'alert'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialog(null)}
        inputPlaceholder={dialog?.inputPlaceholder}
      />
    </div>
  );
};
