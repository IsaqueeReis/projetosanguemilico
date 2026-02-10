
import React, { useState, useEffect, useMemo } from 'react';
import { MentorshipStorage } from './storage';
import { globalRepo } from '../services/repository'; 
import { MentorshipPlan, MentorshipTask, DAYS_OF_WEEK, TASK_TYPES, TaskType, AIPlanItem, DetectedSubject, SubjectConfig, ExtraGoalConfig } from './types';
import { User, Plan, UserRole, Edital } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Brain, Calendar, Check, Save, Sparkles, Trash2, List, FileText, ChevronRight, Activity, Zap, Scale, BarChart2, Plus, X, AlertTriangle } from 'lucide-react';

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
  const premiumPlan = useMemo(() => plans.find(p => p.name.trim().toUpperCase() === 'MENTORIA PREMIUM'), [plans]);
  
  const premiumStudents = useMemo(() => {
      return users.filter(u => u.role === UserRole.STUDENT && premiumPlan && u.planId === premiumPlan.id);
  }, [users, premiumPlan]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<MentorshipPlan | null>(null);
  const [activeMode, setActiveMode] = useState<'DAILY' | 'PLANNER'>('DAILY');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados Tarefa Manual
  const [taskDay, setTaskDay] = useState(DAYS_OF_WEEK[0]);
  const [taskType, setTaskType] = useState<TaskType>('AULA');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  // --- ESTADOS DO GERADOR IA 2.0 ---
  const [plannerStep, setPlannerStep] = useState<'INPUT' | 'CONFIG' | 'PREVIEW'>('INPUT');
  const [rawEdital, setRawEdital] = useState('');
  const [detectedStructure, setDetectedStructure] = useState<DetectedSubject[]>([]);
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfig>>({});
  
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
    loadPlan();
    return () => { isMounted = false; };
  }, [selectedStudentId, premiumStudents]);

  // --- ACTIONS MANUAIS ---
  const handleAddTask = async () => {
    if (!currentPlan || !taskSubject) return;
    const newTask: MentorshipTask = {
      id: Date.now().toString(), dayOfWeek: taskDay, type: taskType, subject: taskSubject, description: taskDesc, isCompleted: false
    };
    const updatedPlan = { ...currentPlan, tasks: [...currentPlan.tasks, newTask] };
    await MentorshipStorage.savePlan(updatedPlan);
    setCurrentPlan(updatedPlan);
    setTaskSubject(''); setTaskDesc('');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, tasks: currentPlan.tasks.filter(t => t.id !== taskId) };
    await MentorshipStorage.savePlan(updatedPlan);
    setCurrentPlan(updatedPlan);
  };

  const handleSendMessage = async () => {
    if (!currentPlan || !newMessage) return;
    const today = new Date().toISOString().split('T')[0];
    const filteredMessages = currentPlan.messages.filter(m => m.date !== today);
    const updatedPlan = { ...currentPlan, messages: [...filteredMessages, { id: Date.now().toString(), date: today, content: newMessage, isRead: false }] };
    await MentorshipStorage.savePlan(updatedPlan);
    setCurrentPlan(updatedPlan);
    setNewMessage('');
    alert('Ordem enviada ao aluno!');
  };

  // --- LÓGICA IA 2.0 ---

  // Passo 1: Analisar Texto e Detectar Estrutura
  const handleAnalyzeEdital = async () => {
      if (!rawEdital) return alert("ERRO: Cole o texto do edital para análise.");
      if (!API_KEY) return alert("ERRO CRÍTICO: Chave de API (API_KEY) não configurada no sistema.");
      
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
          
          // Inicializa configs padrão
          const configs: Record<string, SubjectConfig> = {};
          data.forEach(s => {
              configs[s.name] = { weight: 2, difficulty: 2 }; // Médio por padrão
          });
          setSubjectConfigs(configs);
          setPlannerStep('CONFIG');

      } catch (err) {
          console.error(err);
          alert("Falha na Inteligência: Não foi possível estruturar o edital. Tente limpar o texto e colar apenas a lista de conteúdos.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Passo 2: Exportar para Edital Global (Opcional)
  const handleExportToGlobalEdital = async () => {
      if (detectedStructure.length === 0) return;
      const title = prompt("Digite o NOME do edital para a aba 'Gestão de Editais':", "Edital Verticalizado PM");
      if (!title) return;

      try {
          const newEdital: Edital = {
              id: `edital-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
              title,
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
          alert(`Edital "${title}" salvo com sucesso! Verifique na aba 'Gestão de Editais'.`);
      } catch (err) {
          console.error(err);
          alert("Erro ao salvar edital global. Verifique o console.");
      }
  };

  // Passo 3: Gerar Cronograma Final (Prompt Atualizado - Ciclo Semanal Rigoroso)
  const handleGenerateSchedule = async () => {
      if (!API_KEY) return alert("ERRO CRÍTICO: Chave de API ausente.");
      
      setIsGenerating(true);
      try {
          const ai = new GoogleGenAI({ apiKey: API_KEY });
          
          // Prepara contexto das configs
          const configContext = Object.entries(subjectConfigs).map(([name, conf]) => {
              const c = conf as SubjectConfig;
              return `- ${name}: Peso ${c.weight}/3, Dificuldade Aluno ${c.difficulty}/3`;
          }).join('\n');

          const prompt = `
            Atue como um Mentor Militar de Elite ("Sangue Milico").
            Objetivo: Criar um cronograma de estudos BRUTAL, DETALHADO e CÍCLICO.
            Data de Início: ${startDatePlanner}.
            
            ESTRUTURA DO CICLO SEMANAL (REGRA DE FERRO):
            1. DIAS DE COMBATE (Segunda a Sábado):
               - Apenas matérias teóricas e questões.
               - O aluno estudará exatamente ${subjectsPerDay} MATÉRIAS DIFERENTES POR DIA.
               - Distribua as matérias listadas no edital para preencher a semana (Seg-Sáb). Se acabar as matérias, repita ou avance. Todas as matérias devem aparecer na semana.
            
            2. DIA DE GUERRA (Domingo):
               - O Domingo é SAGRADO para simulação.
               - NÃO coloque matérias teóricas no Domingo.
               - Gere APENAS duas tarefas fixas para todo Domingo:
                 a) "SIMULADO GERAL" (Type: SIMULADO)
                 b) "REDAÇÃO TÁTICA" (Type: REVISAO - instrução: "Escrever redação modelo prova")

            ESTRUTURA DA TAREFA (Padrão Sangue Milico) - Apenas para Seg-Sáb:
            Para CADA matéria agendada no dia, você DEVE gerar EXATAMENTE 3 tarefas sequenciais:
               - Tarefa 1: "AULA TEÓRICA 1" (Type: AULA)
               - Tarefa 2: "AULA TEÓRICA 2" (Type: AULA)
               - Tarefa 3: "BATERIA DE QUESTÕES (Min 10)" (Type: QUESTOES)
            
            LEI SECA: ${includeLeiSeca ? 'SIM. Adicione UMA tarefa extra de LEI_SECA por dia (apenas Seg-Sáb).' : 'NÃO.'}
            
            PRIORIDADES DE MATÉRIAS:
            ${configContext}
            
            MATÉRIAS DO EDITAL:
            ${JSON.stringify(detectedStructure)}
            
            RETORNO JSON (Array Puro):
            [
              {
                "dayOffset": 0, // 0 = Dia 1, 6 = Domingo (Simulado), etc. Calcule até cobrir todo o edital.
                "subject": "Nome da Matéria", // Ou "SIMULADO" no domingo
                "topic": "Tópico Específico",
                "type": "AULA" | "LEI_SECA" | "QUESTOES" | "SIMULADO" | "REVISAO",
                "instructions": "Instrução breve"
              }
            ]
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [{ text: prompt }] },
              config: { 
                  temperature: 0.7,
                  responseMimeType: "application/json" // CRUCIAL: Garante JSON puro
              }
          });

          const text = response.text || '';
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          
          let rawSchedule: AIPlanItem[] = [];
          
          try {
              rawSchedule = JSON.parse(jsonStr);
          } catch (parseError) {
              console.error("Erro JSON cru:", text);
              throw new Error("A IA retornou um formato inválido. Tente novamente.");
          }
          
          if (!Array.isArray(rawSchedule) || rawSchedule.length === 0) {
              throw new Error("A IA não gerou nenhuma missão. Verifique o edital inserido.");
          }

          setGeneratedItems(rawSchedule);
          
          // Calcular data de término
          const maxDayOffset = rawSchedule.reduce((max, item) => Math.max(max, item.dayOffset), 0);
          const [y, m, d] = startDatePlanner.split('-').map(Number);
          const endDate = new Date(y, m - 1, d);
          endDate.setDate(endDate.getDate() + maxDayOffset);
          setCalculatedEndDate(endDate.toLocaleDateString('pt-BR'));

          setPlannerStep('PREVIEW');

      } catch (err: any) {
          console.error(err);
          alert(`Erro na Operação Tática: ${err.message || 'Falha desconhecida ao gerar cronograma.'}`);
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

  // Aplicação Final ao Aluno
  const handleApplyFinalPlan = async () => {
      if (!currentPlan) return;
      if (!window.confirm(`Isso implantará o plano com término previsto em ${calculatedEndDate}. Todas as tarefas serão adicionadas ao calendário do aluno. Confirmar?`)) return;

      try {
          // 1. Converte itens da IA em Tasks
          const aiTasks: MentorshipTask[] = generatedItems.map(item => {
              // Correção de Data: Criar data ao meio-dia para evitar problemas de fuso horário UTC
              const [year, month, day] = startDatePlanner.split('-').map(Number);
              const date = new Date(year, month - 1, day, 12, 0, 0); 
              date.setDate(date.getDate() + item.dayOffset); // dayOffset 0 é o primeiro dia
              
              const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
              const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
              const dateStr = date.toLocaleDateString('pt-BR').split('/').reverse().join('-');

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
              const date = new Date(year, month - 1, day, 12, 0, 0);
              date.setDate(date.getDate() + i);
              
              const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
              const dayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
              const dateStr = date.toLocaleDateString('pt-BR').split('/').reverse().join('-');

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

          const updatedPlan = {
              ...currentPlan,
              tasks: [...currentPlan.tasks, ...aiTasks, ...extraTasks]
          };

          await MentorshipStorage.savePlan(updatedPlan);
          setCurrentPlan(updatedPlan);
          
          // Reset
          setPlannerStep('INPUT');
          setGeneratedItems([]);
          setExtraGoals([]);
          setActiveMode('DAILY');
          alert("Plano de Guerra implantado com sucesso! O cronograma foi atualizado.");

      } catch (err) {
          console.error(err);
          alert("Erro crítico ao salvar o plano. Tente novamente.");
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
                      <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wide flex items-center gap-2">
                          <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                          Inteligência do Edital
                      </h3>
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
                              </div>
                              
                              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                  {detectedStructure.map((subj, idx) => (
                                      <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-white font-bold">{subj.name}</span>
                                              <span className="text-xs text-zinc-500">{subj.topics.length} tópicos</span>
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

                              <button 
                                  onClick={handleApplyFinalPlan}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                              >
                                  <Save size={18}/> Implantar Plano
                              </button>
                              <button onClick={() => setPlannerStep('CONFIG')} className="w-full text-zinc-500 text-xs mt-2 underline text-center">Voltar Config</button>
                          </div>
                      </div>
                  </div>
              )}
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
              <button onClick={handleAddTask} className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 mt-2 transition-all"><Icon name="plus" /> Adicionar ao Plano</button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
             <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center"><h3 className="font-bold text-white uppercase text-sm tracking-wide">Cronograma Tático Semanal</h3><span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">Visualização de Comando</span></div>
             <div className="divide-y divide-zinc-800">{DAYS_OF_WEEK.map(day => { const dayTasks = currentPlan.tasks.filter(t => t.dayOfWeek === day); return (<div key={day} className="flex flex-col md:flex-row md:items-start p-4 hover:bg-zinc-900/50 transition-colors"><div className="w-24 flex-shrink-0 mb-2 md:mb-0"><span className={`text-sm font-bold uppercase tracking-wider ${dayTasks.length > 0 ? 'text-white' : 'text-zinc-600'}`}>{day.substring(0, 3)}</span></div><div className="flex-1 space-y-2">{dayTasks.length === 0 && <span className="text-xs text-zinc-700 italic">Sem missões</span>}{dayTasks.map(task => { const typeInfo = TASK_TYPES.find(t => t.type === task.type); return (<div key={task.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2 rounded group hover:border-zinc-600 transition-colors"><div className="flex items-center gap-3"><div className={`w-2 h-8 rounded ${typeInfo?.color || 'bg-gray-500'}`}></div><div><p className="text-sm font-bold text-zinc-200">{task.subject}</p><p className="text-xs text-zinc-500">{typeInfo?.label} {task.description && `• ${task.description}`}</p></div></div><button onClick={() => handleDeleteTask(task.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Icon name="trash" /></button></div>); })}</div></div>); })}</div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
