
import React, { useState, useEffect } from 'react';
import { MentorshipStorage } from './storage';
import { MentorshipPlan, MentorshipTask, TASK_TYPES, DAYS_OF_WEEK } from './types';
import { Check, X, Clock, AlertTriangle, Shield, RefreshCw, Calendar, ArrowLeft, ArrowRight, FastForward, Trash2, ShieldAlert, ShieldCheck, Star, Award, Medal, Crown, ChevronUp, ChevronsUp, Hexagon, Circle, Sun } from 'lucide-react';
import { Dialog, DialogType } from '../components/ui/Dialog';

const RankBadge = ({ rankName, colorClass }: { rankName: string, colorClass: string }) => {
  const color = colorClass.replace('text-', '');
  
  const getIcon = () => {
    switch (rankName) {
      case 'Soldado': return <img src="https://i.ibb.co/fYfQ6K1W/image.png" alt="Soldado" className="w-8 h-8" style={{ mixBlendMode: 'multiply' }} />;
      case 'Cabo': return <img src="https://i.ibb.co/WpPM3Cyg/image.png" alt="Cabo" className="w-8 h-8" style={{ mixBlendMode: 'multiply' }} />;
      case '3º Sargento': return <img src="https://i.ibb.co/27NSkJmV/image.png" alt="3º Sargento" className="w-8 h-8" style={{ mixBlendMode: 'multiply' }} />;
      case '2º Sargento': return <div className="flex flex-col items-center"><div className="flex flex-col -space-y-3"><ChevronUp size={20} className={colorClass} /><ChevronUp size={20} className={colorClass} /><ChevronUp size={20} className={colorClass} /></div><div className="w-6 h-1 bg-current mt-1" /></div>;
      case '1º Sargento': return <div className="flex flex-col items-center"><div className="flex flex-col -space-y-3"><ChevronUp size={20} className={colorClass} /><ChevronUp size={20} className={colorClass} /><ChevronUp size={20} className={colorClass} /></div><div className="flex flex-col -space-y-1 mt-1"><div className="w-6 h-1 bg-current" /><div className="w-6 h-1 bg-current" /></div></div>;
      case 'Subtenente': return <Hexagon size={24} className={colorClass} />;
      case 'Aspirante': return <Star size={24} className={colorClass} fill="currentColor" />;
      case '2º Tenente': return <Star size={24} className={colorClass} fill="currentColor" />;
      case '1º Tenente': return <div className="flex gap-1"><Star size={20} className={colorClass} fill="currentColor" /><Star size={20} className={colorClass} fill="currentColor" /></div>;
      case 'Capitão': return <div className="flex gap-1"><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /></div>;
      case 'Major': return <Star size={24} className={colorClass} fill="currentColor" />;
      case 'Tenente-Coronel': return <div className="flex gap-1"><Star size={20} className={colorClass} fill="currentColor" /><Star size={20} className={colorClass} fill="currentColor" /></div>;
      case 'Coronel': return <div className="flex gap-1"><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /></div>;
      case 'General de Brigada': return <div className="flex flex-col items-center"><Hexagon size={20} className={colorClass} /><Star size={16} className={colorClass} fill="currentColor" /></div>;
      case 'General de Divisão': return <div className="flex flex-col items-center"><Hexagon size={20} className={colorClass} /><div className="flex gap-1"><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /></div></div>;
      case 'General de Exército': return <div className="flex flex-col items-center"><Hexagon size={20} className={colorClass} /><div className="flex gap-1"><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /><Star size={16} className={colorClass} fill="currentColor" /></div></div>;
      case 'Marechal': return <div className="flex flex-col items-center"><Hexagon size={20} className={colorClass} /><div className="flex gap-1"><Star size={12} className={colorClass} fill="currentColor" /><Star size={12} className={colorClass} fill="currentColor" /><Star size={12} className={colorClass} fill="currentColor" /><Star size={12} className={colorClass} fill="currentColor" /></div></div>;
      default: return <Shield size={24} className={colorClass} />;
    }
  };

  return (
    <div className={`w-16 h-16 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
      {getIcon()}
    </div>
  );
};

export const StudentMentorshipPanel = ({ studentId }: { studentId: string }) => {
  const [plan, setPlan] = useState<MentorshipPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayDate] = useState(new Date());
  
  // Estado para o Modal de Conclusão Tática
  const [taskToComplete, setTaskToComplete] = useState<MentorshipTask | null>(null);
  
  // Estado para o Modal de Replanejamento
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [delayedTasksCount, setDelayedTasksCount] = useState(0);
  
  // Estado para o Modal de Reset
  const [showResetModal, setShowResetModal] = useState(false);

  // Estado para o Modal de Adiantar Metas
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);

  // --- SISTEMA DE DIÁLOGO CUSTOMIZADO ---
  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      type: DialogType;
      title: string;
      message: string;
      onConfirm?: (value?: string) => void;
      onCancel?: () => void;
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


  const weekDayIndex = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;
  const currentDayName = DAYS_OF_WEEK[weekDayIndex];
  
  const y = todayDate.getFullYear();
  const m = String(todayDate.getMonth() + 1).padStart(2, '0');
  const d = String(todayDate.getDate()).padStart(2, '0');
  const isoDate = `${y}-${m}-${d}`;

  useEffect(() => {
    const loadPlan = async () => {
        try {
            setLoading(true);
            const loadedPlan = await MentorshipStorage.initPlan(studentId, 'Aluno');
            setPlan(loadedPlan);
            setError(null);
        } catch (err) {
            console.error("Erro ao carregar plano:", err);
            setError("Não foi possível carregar os dados da missão. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };
    loadPlan();
  }, [studentId]);

  // Abre o modal ao invés de concluir direto
  const handleTaskClick = (task: MentorshipTask) => {
      if (!plan) return;

      // Se já estiver completa, apenas permite desmarcar (sem modal)
      if (task.isCompleted) {
          toggleTaskStatus(task.id, false);
      } else {
          // Verifica se há missões anteriores não concluídas
          const taskIndex = plan.tasks.findIndex(t => t.id === task.id);
          const hasPendingPreviousTasks = plan.tasks.some((t, index) => 
              index < taskIndex && !t.isCompleted
          );
          if (hasPendingPreviousTasks) {
              showAlert("Atenção", "Você não pode concluir esta missão sem antes ter concluído todas as missões anteriores da fila.");
              return;
          }
          setTaskToComplete(task);
      }
  };

  const calculateXP = (type: string) => {
      switch (type) {
          case 'SIMULADO': return 100;
          case 'AULA': return 50;
          case 'REVISAO': return 40;
          case 'QUESTOES': return 30;
          case 'LEI_SECA': return 20;
          case 'META_EXTRA': return 10;
          default: return 10;
      }
  };

  const toggleTaskStatus = async (taskId: string, status: boolean) => {
    if (!plan) return;
    
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTasks = plan.tasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: status } : t
    );

    const xpAmount = calculateXP(task.type);
    let newXp = plan.xp || 0;

    if (status) {
        newXp += xpAmount;
    } else {
        newXp = Math.max(0, newXp - xpAmount);
    }

    const updatedPlan = { ...plan, tasks: updatedTasks, xp: newXp };
    setPlan(updatedPlan);
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao salvar progresso:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar seu progresso. Verifique sua conexão com a internet.");
        // Revert state
        setPlan(plan);
    }
  };

  const handleRescheduleClick = () => {
    if (!plan) return;

    // 1. Identificar atrasos (com data definida, no passado, não concluídas)
    const delayedTasks = plan.tasks.filter(t => {
        if (!t.date) return false; // Ignora tarefas genéricas sem data
        return t.date < isoDate && !t.isCompleted;
    });

    if (delayedTasks.length === 0) {
        showAlert("Aviso", "Nenhuma missão atrasada encontrada, soldado! Mantenha o padrão.");
        return;
    }

    setDelayedTasksCount(delayedTasks.length);
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!plan) return;

    const delayedTasks = plan.tasks.filter(t => {
        if (!t.date) return false;
        return t.date < isoDate && !t.isCompleted;
    });

    // 2. Identificar dias de estudo ativos (baseado no plano existente)
    const activeWeekDays = Array.from(new Set(plan.tasks.map(t => t.dayOfWeek)));
    const validDays = activeWeekDays.length > 0 ? activeWeekDays : DAYS_OF_WEEK;

    // 3. Encontrar próximas datas válidas (Next 7 study days)
    let availableDates: string[] = [];
    let dateCursor = new Date(todayDate);
    dateCursor.setDate(dateCursor.getDate() + 1); // Começa amanhã

    while (availableDates.length < 7) { 
        const dayName = DAYS_OF_WEEK[dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1];
        if (validDays.includes(dayName)) {
            availableDates.push(dateCursor.toLocaleDateString('pt-BR').split('/').reverse().join('-'));
        }
        dateCursor.setDate(dateCursor.getDate() + 1);
        if (availableDates.length >= 30) break; // Safety
    }

    if (availableDates.length === 0) {
         // Fallback
         const tomorrow = new Date(todayDate);
         tomorrow.setDate(tomorrow.getDate() + 1);
         availableDates.push(tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-'));
    }

    // 4. Atualizar as tarefas
    let dateIdx = 0;
    const updatedTasks = plan.tasks.map(t => {
        if (delayedTasks.find(dt => dt.id === t.id)) {
            const targetDate = availableDates[dateIdx % availableDates.length];
            dateIdx++;
            
            const d = new Date(targetDate + 'T12:00:00');
            const newDayName = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];

            return {
                ...t,
                originalDate: t.originalDate || t.date,
                date: targetDate,
                dayOfWeek: newDayName,
                description: (t.description || '') + ' [Replanejado]',
            };
        }
        return t;
    });

    // 5. Salvar
    const updatedPlan = { ...plan, tasks: updatedTasks };
    setPlan(updatedPlan);
    try {
        await MentorshipStorage.savePlan(updatedPlan);
    } catch (err) {
        console.error("Erro ao salvar replanejamento:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar o replanejamento. Verifique sua conexão.");
        setPlan(plan);
    }
    
    setShowRescheduleModal(false);
  };

  const confirmResetPlan = async () => {
      if (!plan) return;
      
      const updatedTasks = plan.tasks.map(t => {
          const targetDate = t.originalDate || t.date;
          let newDayName = t.dayOfWeek;
          if (targetDate) {
              const [y, m, d] = targetDate.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const newDayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
              newDayName = DAYS_OF_WEEK[newDayIndex];
          }
          return {
              ...t,
              isCompleted: false,
              date: targetDate,
              dayOfWeek: newDayName,
              description: t.description?.replace(/ \[Replanejado\]| \[Adiantado\]/g, '') || ''
          };
      });

      const updatedPlan = { ...plan, tasks: updatedTasks, xp: 0 };
      
      setPlan(updatedPlan);
      try {
        await MentorshipStorage.savePlan(updatedPlan);
      } catch (err) {
        console.error("Erro ao salvar reset:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar o reset. Verifique sua conexão.");
        setPlan(plan);
      }
      setShowResetModal(false);
      showAlert("Sucesso", "Plano reiniciado com sucesso! Bons estudos, soldado.");
  };

  const handleDeletePlan = () => {
      showConfirm('Zona de Perigo', 'Tem certeza que deseja EXCLUIR todo o seu plano de estudos? Essa ação é irreversível e você perderá todo o histórico.', async () => {
          await MentorshipStorage.deletePlan(studentId);
          setPlan(null);
          window.location.reload(); 
      });
  };

  const handleAdvanceGoals = async (mode: 'rest' | 'shift') => {
      if (!plan) return;

      const tomorrow = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-');

      let updatedTasks = [...plan.tasks];

      if (mode === 'rest') {
          // Move tomorrow's tasks to today
          updatedTasks = updatedTasks.map(t => {
              if (t.date === tomorrowIso) {
                  return {
                      ...t,
                      originalDate: t.originalDate || t.date,
                      date: isoDate,
                      dayOfWeek: currentDayName,
                      description: (t.description || '') + ' [Adiantado]'
                  };
              }
              return t;
          });
      } else if (mode === 'shift') {
          // Shift all future tasks (date > today) by -1 day
          updatedTasks = updatedTasks.map(t => {
              if (t.date && t.date > isoDate) {
                  // Parse date
                  const [y, m, d] = t.date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  dateObj.setDate(dateObj.getDate() - 1);
                  
                  const newIso = dateObj.toLocaleDateString('pt-BR').split('/').reverse().join('-');
                  const newDayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
                  const newDayName = DAYS_OF_WEEK[newDayIndex];

                  return {
                      ...t,
                      originalDate: t.originalDate || t.date,
                      date: newIso,
                      dayOfWeek: newDayName,
                      description: t.date === tomorrowIso ? (t.description || '') + ' [Adiantado]' : t.description
                  };
              }
              return t;
          });
      }

      const updatedPlan = { ...plan, tasks: updatedTasks };
      setPlan(updatedPlan);
      try {
        await MentorshipStorage.savePlan(updatedPlan);
      } catch (err) {
        console.error("Erro ao salvar adiantamento:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar o adiantamento. Verifique sua conexão.");
        setPlan(plan);
      }
      setShowAdvanceModal(false);
      showAlert("Sucesso", mode === 'rest' ? "Metas adiantadas! Amanhã está livre." : "Cronograma adiantado! O ritmo acelerou.");
  };

  // Helper para obter a data de um dia específico da semana atual (Locale Independent)
  const getWeekDate = (dayIndex: number, offset: number = 0) => {
      const diff = dayIndex - weekDayIndex + (offset * 7);
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + diff);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
  };

  const handleConfirmCompletion = async (needsMoreTime: boolean) => {
      if (!taskToComplete || !plan) return;

      let updatedTasks = [...plan.tasks];
      
      const xpAmount = calculateXP(taskToComplete.type);
      const newXp = (plan.xp || 0) + xpAmount;

      // 1. Marca a tarefa original como concluída
      updatedTasks = updatedTasks.map(t => 
          t.id === taskToComplete.id ? { ...t, isCompleted: true } : t
      );

      // 2. Se precisa de mais tempo, reprograma e empurra as próximas
      if (needsMoreTime) {
          // ... (keep existing rescheduling logic, but use updatedTasks)
          // Find future tasks for the same subject
          const futureSubjectTasks = updatedTasks.filter(t => 
              t.subject === taskToComplete.subject && 
              t.date && t.date > isoDate && 
              !t.isCompleted
          ).sort((a, b) => a.date!.localeCompare(b.date!));

          // Determine which days of the week this subject is studied
          const subjectDaysOfWeek = Array.from(new Set(updatedTasks.filter(t => t.subject === taskToComplete.subject).map(t => t.dayOfWeek)));
          const validDays = subjectDaysOfWeek.length > 0 ? subjectDaysOfWeek : DAYS_OF_WEEK;

          let continuationDateIso = '';
          let continuationDayName = '';

          if (futureSubjectTasks.length > 0) {
              // The continuation task takes the slot of the FIRST future task
              continuationDateIso = futureSubjectTasks[0].date!;
              continuationDayName = futureSubjectTasks[0].dayOfWeek;

              // Shift all future tasks forward by one slot
              for (let i = 0; i < futureSubjectTasks.length; i++) {
                  const currentTask = futureSubjectTasks[i];
                  let nextDateIso = '';
                  let nextDayName = '';

                  if (i + 1 < futureSubjectTasks.length) {
                      // Take the date of the next task in the list
                      nextDateIso = futureSubjectTasks[i + 1].date!;
                      nextDayName = futureSubjectTasks[i + 1].dayOfWeek;
                  } else {
                      // This is the last task, find the next valid day after its current date
                      let dateCursor = new Date(currentTask.date! + 'T12:00:00');
                      dateCursor.setDate(dateCursor.getDate() + 1);
                      
                      // Find next valid day
                      while (true) {
                          const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                          const dayName = DAYS_OF_WEEK[dayIndex];
                          if (validDays.includes(dayName)) {
                              nextDateIso = dateCursor.toLocaleDateString('pt-BR').split('/').reverse().join('-');
                              nextDayName = dayName;
                              break;
                          }
                          dateCursor.setDate(dateCursor.getDate() + 1);
                      }
                  }

                  // Update the task in the main array
                  const taskIndex = updatedTasks.findIndex(t => t.id === currentTask.id);
                  if (taskIndex !== -1) {
                      updatedTasks[taskIndex] = {
                          ...updatedTasks[taskIndex],
                          date: nextDateIso,
                          dayOfWeek: nextDayName
                      };
                  }
              }
          } else {
              // No future tasks, just find the next valid day after today
              let dateCursor = new Date(todayDate);
              dateCursor.setDate(dateCursor.getDate() + 1);
              while (true) {
                  const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                  const dayName = DAYS_OF_WEEK[dayIndex];
                  if (validDays.includes(dayName)) {
                      continuationDateIso = dateCursor.toLocaleDateString('pt-BR').split('/').reverse().join('-');
                      continuationDayName = dayName;
                      break;
                  }
                  dateCursor.setDate(dateCursor.getDate() + 1);
              }
          }

          // Create and insert the continuation task
          const continuationTask: MentorshipTask = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              dayOfWeek: continuationDayName,
              date: continuationDateIso,
              type: taskToComplete.type,
              subject: taskToComplete.subject,
              description: `${taskToComplete.description} (Reforço/Continuação)`,
              isCompleted: false
          };
          
          updatedTasks.push(continuationTask);
          
          const [y, m, d] = continuationDateIso.split('-').map(Number);
          const formattedDate = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
          showAlert("Reforço Aprovado", `Ciente, soldado! Conteúdo reprogramado para ${continuationDayName} (${formattedDate}). As missões seguintes de ${taskToComplete.subject} foram adiadas.`);
      }

      const updatedPlan = { ...plan, tasks: updatedTasks, xp: newXp };
      setPlan(updatedPlan);
      try {
        await MentorshipStorage.savePlan(updatedPlan);
      } catch (err) {
        console.error("Erro ao salvar conclusão:", err);
        showAlert("Erro de Conexão", "Não foi possível salvar a conclusão da missão. Verifique sua conexão.");
        setPlan(plan);
      }
      setTaskToComplete(null);
  };

  const getRankInfo = (xp: number) => {
      const ranks = [
          { name: 'Soldado', min: 0, max: 200, color: 'text-zinc-500', icon: 'Shield' },
          { name: 'Cabo', min: 200, max: 500, color: 'text-zinc-400', icon: 'Shield' },
          { name: '3º Sargento', min: 500, max: 1000, color: 'text-zinc-300', icon: 'ShieldAlert' },
          { name: '2º Sargento', min: 1000, max: 1500, color: 'text-zinc-300', icon: 'ShieldAlert' },
          { name: '1º Sargento', min: 1500, max: 2000, color: 'text-zinc-300', icon: 'ShieldAlert' },
          { name: 'Subtenente', min: 2000, max: 3000, color: 'text-blue-400', icon: 'ShieldCheck' },
          { name: 'Aspirante', min: 3000, max: 4000, color: 'text-blue-500', icon: 'ShieldCheck' },
          { name: '2º Tenente', min: 4000, max: 6000, color: 'text-blue-600', icon: 'ShieldCheck' },
          { name: '1º Tenente', min: 6000, max: 8000, color: 'text-indigo-400', icon: 'Star' },
          { name: 'Capitão', min: 8000, max: 12000, color: 'text-indigo-500', icon: 'Star' },
          { name: 'Major', min: 12000, max: 18000, color: 'text-purple-400', icon: 'Award' },
          { name: 'Tenente-Coronel', min: 18000, max: 25000, color: 'text-purple-500', icon: 'Award' },
          { name: 'Coronel', min: 25000, max: 35000, color: 'text-red-400', icon: 'Medal' },
          { name: 'General de Brigada', min: 35000, max: 50000, color: 'text-red-500', icon: 'Medal' },
          { name: 'General de Divisão', min: 50000, max: 70000, color: 'text-red-600', icon: 'Crown' },
          { name: 'General de Exército', min: 70000, max: 100000, color: 'text-yellow-500', icon: 'Crown' },
          { name: 'Marechal', min: 100000, max: Infinity, color: 'text-yellow-500', icon: 'Crown' }
      ];

      const currentRankIndex = ranks.findIndex(r => xp >= r.min && xp < r.max);
      const currentRank = ranks[currentRankIndex !== -1 ? currentRankIndex : ranks.length - 1];
      const nextRank = currentRankIndex !== -1 && currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;
      
      let progress = 100;
      if (nextRank) {
          progress = ((xp - currentRank.min) / (nextRank.min - currentRank.min)) * 100;
      }

      return { currentRank, nextRank, progress };
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center p-20 text-zinc-500 bg-[#09090b] min-h-screen">
              <RefreshCw className="animate-spin mb-4 text-red-600" size={48} />
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">Sincronizando com o Comando...</h2>
              <p className="mt-2 italic">Aguarde, soldado. Carregando dados da missão.</p>
          </div>
      );
  }

  if (error || !plan) {
      return (
          <div className="flex flex-col items-center justify-center p-20 text-zinc-500 bg-[#09090b] min-h-screen">
              <AlertTriangle className="mb-4 text-red-600" size={48} />
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">Falha na Comunicação</h2>
              <p className="mt-2">{error || "Plano não encontrado."}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                TENTAR NOVAMENTE
              </button>
          </div>
      );
  }

  const todaysMessage = plan.messages?.find(m => m.date === isoDate);
  const todaysTasks = (plan.tasks || []).filter(t => {
      if (t.date) return t.date === isoDate && !t.isCompleted;
      return false;
  });
  
  const completedCount = (plan.tasks || []).filter(t => t.date === isoDate && t.isCompleted).length;
  const totalCount = todaysTasks.length + completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const rankInfo = getRankInfo(plan.xp || 0);

  const RankIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
      const icons: any = {
          Shield, ShieldAlert, ShieldCheck, Star, Award, Medal, Crown
      };
      const IconComponent = icons[iconName] || Shield;
      return <IconComponent className={className} />;
  };

  return (
    <div className="bg-[#09090b] text-zinc-200 min-h-screen font-sans relative">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-zinc-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
               <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Canal Seguro Ativo</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
              Central de <span className="text-red-600">Comando</span>
            </h1>
            <p className="text-zinc-500 mt-1">Sua rota diária rumo à aprovação.</p>
          </div>
          <div className="text-right">
             <div className="text-4xl font-black text-white font-mono">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
             <div className="text-red-600 font-bold uppercase text-sm">{currentDayName}</div>
          </div>
        </header>

        {/* XP & Ranking System */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
                <RankIcon iconName={rankInfo.currentRank.icon} className={`w-64 h-64 ${rankInfo.currentRank.color}`} />
            </div>
            <div className="flex justify-between items-end mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl ${rankInfo.currentRank.color}`}>
                        <RankIcon iconName={rankInfo.currentRank.icon} className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-bold">Patente Atual</div>
                        <div className={`text-3xl font-black uppercase tracking-tight ${rankInfo.currentRank.color}`}>
                            {rankInfo.currentRank.name}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-bold">Experiência</div>
                    <div className="text-2xl font-mono font-bold text-white">
                        {plan.xp || 0} <span className="text-zinc-500 text-sm">XP</span>
                    </div>
                </div>
            </div>
            
            <div className="h-4 bg-zinc-950 rounded-full overflow-hidden relative border border-zinc-800 shadow-inner">
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 relative overflow-hidden"
                    style={{ width: `${rankInfo.progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                </div>
            </div>
            
            {rankInfo.nextRank && (
                <div className="flex justify-between items-center mt-3 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    <span>Progresso para promoção</span>
                    <span className="text-zinc-400">Faltam <span className="text-white">{rankInfo.nextRank.min - (plan.xp || 0)} XP</span> para <span className={rankInfo.nextRank.color}>{rankInfo.nextRank.name}</span></span>
                </div>
            )}
        </section>

        <section className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-lg">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
           </div>
           <h2 className="text-red-500 font-bold uppercase text-xs tracking-[0.2em] mb-4 flex items-center gap-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
             Ordem do Dia
           </h2>
           {todaysMessage ? (
             <div className="relative z-10">
               <p className="text-lg md:text-xl text-white font-medium leading-relaxed italic">
                 "{todaysMessage.content}"
               </p>
               <div className="mt-4 flex items-center gap-2">
                 <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-xs text-zinc-300">MT</div>
                 <span className="text-xs text-zinc-500 uppercase font-bold">Mentor Tático</span>
               </div>
             </div>
           ) : (
             <p className="text-zinc-500 italic">Nenhuma ordem específica do comando para hoje. Mantenha o padrão.</p>
           )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center mb-2">
               <h3 className="text-white font-bold uppercase text-lg flex items-center gap-2">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                 Missões de Hoje
               </h3>
               <div className="flex items-center gap-2">
                   <button 
                     onClick={handleDeletePlan}
                     className="text-xs font-bold uppercase text-zinc-500 hover:text-red-600 flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800 hover:border-red-900 transition-all"
                     title="Excluir Plano"
                   >
                     <Trash2 size={12} /> Excluir
                   </button>
                   <button 
                     onClick={() => setShowResetModal(true)}
                     className="text-xs font-bold uppercase text-red-600 hover:text-red-500 flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800 hover:border-red-600 transition-all"
                     title="Resetar Plano"
                   >
                     <RefreshCw size={12} className="rotate-180" /> Resetar
                   </button>
                   <button 
                     onClick={handleRescheduleClick}
                     className="text-xs font-bold uppercase text-yellow-600 hover:text-yellow-500 flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800 hover:border-yellow-600 transition-all"
                     title="Replanejar Atrasos"
                   >
                     <Clock size={12} /> Replanejar
                   </button>
                   <button 
                     onClick={() => setShowAdvanceModal(true)}
                     className="text-xs font-bold uppercase text-blue-600 hover:text-blue-500 flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800 hover:border-blue-600 transition-all"
                     title="Adiantar Metas"
                   >
                     <FastForward size={12} /> Adiantar
                   </button>
                   <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                     {completedCount}/{totalCount} Concluídas
                   </span>
               </div>
             </div>

             <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden mb-6">
               <div 
                 className="h-full bg-red-600 transition-all duration-500 ease-out"
                 style={{ width: `${progressPercent}%` }}
               />
             </div>

             <div className="space-y-3">
               {todaysTasks.length === 0 && (
                 <div className="p-8 text-center bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed text-zinc-500">
                   Sem missões agendadas para hoje. Aproveite para revisar ou descansar.
                 </div>
               )}
               
               {todaysTasks.map(task => {
                 const typeInfo = TASK_TYPES.find(t => t.type === task.type);
                 return (
                   <div 
                     key={task.id}
                     onClick={() => handleTaskClick(task)}
                     className={`
                       group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
                       ${task.isCompleted 
                         ? 'bg-zinc-900/50 border-zinc-800 opacity-60' 
                         : 'bg-zinc-900 border-zinc-700 hover:border-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]'
                       }
                     `}
                   >
                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeInfo?.color || 'bg-gray-500'}`} />
                     <div className="flex items-start gap-4 pl-2">
                       <div className={`mt-1 w-6 h-6 rounded border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-red-600 border-red-600' : 'bg-transparent border-zinc-600 group-hover:border-red-500'}`}>
                         {task.isCompleted && <Check width={14} height={14} stroke="white" strokeWidth={4} />}
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <h4 className={`font-bold text-lg ${task.isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>
                             {task.subject}
                           </h4>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                               {typeInfo?.label}
                             </span>
                           </div>
                         </div>
                         {task.description && <p className={`text-sm mt-1 ${task.isCompleted ? 'text-zinc-600' : 'text-zinc-400'}`}>{task.description}</p>}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>

             {/* CRONOGRAMA SEMANAL */}
             <div className="mt-8 pt-8 border-t border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold uppercase text-lg flex items-center gap-2">
                      <Calendar size={20} className="text-red-600" />
                      Cronograma Semanal
                    </h3>
                    <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Semana Anterior">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-xs font-mono font-bold text-zinc-300 px-2 min-w-[100px] text-center">
                            {weekOffset === 0 ? 'Semana Atual' : (weekOffset > 0 ? `+${weekOffset} Semana(s)` : `${weekOffset} Semana(s)`)}
                        </span>
                        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Próxima Semana">
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {DAYS_OF_WEEK.map((day, idx) => {
                        const dateStr = getWeekDate(idx, weekOffset);
                        const isToday = day === currentDayName && weekOffset === 0;
                        
                        // FILTRO RIGOROSO: Apenas tarefas com a data EXATA deste dia
                        const dayTasks = plan.tasks.filter(t => {
                            if (!t.date) return false;
                            return t.date === dateStr;
                        });

                        return (
                            <div key={day} className={`p-4 rounded-xl border ${isToday ? 'bg-zinc-900/80 border-red-900/50' : 'bg-zinc-900/30 border-zinc-800'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className={`font-bold uppercase text-sm ${isToday ? 'text-red-500' : 'text-zinc-400'}`}>{day}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{dateStr.split('-').reverse().slice(0, 2).join('/')}</span>
                                </div>
                                {dayTasks.length > 0 ? (
                                    <div className="space-y-2">
                                        {dayTasks.map(t => {
                                            const tType = TASK_TYPES.find(tt => tt.type === t.type);
                                            return (
                                                <div 
                                                    key={t.id} 
                                                    onClick={() => showAlert("Detalhes da Missão", `Assunto: ${t.subject}\nData: ${dateStr.split('-').reverse().join('/')}\nTipo: ${tType?.label}`)}
                                                    className={`text-xs p-2 rounded border cursor-pointer hover:border-red-500 transition-colors ${t.isCompleted ? 'bg-zinc-900 border-zinc-800 text-zinc-600 line-through' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${tType?.color || 'bg-gray-500'}`}></div>
                                                            <span className="font-bold">{t.subject}</span>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-70">{tType?.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-zinc-700 text-xs italic">Descanso</div>
                                )}
                            </div>
                        );
                    })}
                </div>
             </div>
           </section>

           <section className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-6 h-fit">
            <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Próximos Passos</h3>
            <div className="space-y-4">
               {DAYS_OF_WEEK.map((day, idx) => {
                 if (idx < weekDayIndex) return null;
                 const isToday = day === currentDayName;
                 const targetDate = new Date(todayDate);
                 targetDate.setDate(todayDate.getDate() + (idx - weekDayIndex));
                 
                 const y = targetDate.getFullYear();
                 const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                 const d = String(targetDate.getDate()).padStart(2, '0');
                 const targetIso = `${y}-${m}-${d}`;

                 const tasksForDay = plan.tasks.filter(t => {
                     if (t.date) return t.date === targetIso;
                     return false;
                 });

                 return (
                   <div key={day} className={`flex justify-between items-center py-2 border-b border-zinc-800 ${isToday ? 'opacity-100' : 'opacity-60'}`}>
                     <div className="flex items-center gap-3">
                       <span className={`text-sm font-bold w-10 ${isToday ? 'text-red-500' : 'text-zinc-500'}`}>{day.substring(0, 3)}</span>
                       <div className="h-1.5 w-1.5 rounded-full bg-zinc-700"></div>
                     </div>
                     <span className="text-xs font-mono text-zinc-400">{tasksForDay.length} missões</span>
                   </div>
                 );
               })}
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-800"><p className="text-xs text-zinc-600 text-center leading-relaxed">"A disciplina é a ponte entre metas e realizações."</p></div>
          </section>
        </div>
      </div>

      {/* MODAL DE CONCLUSÃO TÁTICA */}
      {taskToComplete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-red-600 shadow-lg">
                          <Shield size={24} fill="currentColor"/>
                      </div>
                  </div>

                  <div className="text-center mb-8 mt-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Relatório de Combate</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                          Soldado, você já terminou ou precisa estudar mais alguma coisa sobre <br/>
                          <span className="text-white font-bold bg-zinc-800 px-2 py-0.5 rounded">{taskToComplete.subject}</span> <br/>
                          na próxima aula?
                      </p>
                  </div>

                  <div className="space-y-4">
                      <button 
                          onClick={() => handleConfirmCompletion(false)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg group"
                      >
                          <Check size={20} className="group-hover:scale-110 transition-transform"/>
                          <div className="text-left">
                              <span className="block text-sm uppercase tracking-wide">Missão Cumprida</span>
                              <span className="block text-[10px] font-normal opacity-80">Conteúdo dominado. Finalizar.</span>
                          </div>
                      </button>

                      <button 
                          onClick={() => handleConfirmCompletion(true)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border border-zinc-700 hover:border-yellow-600 group"
                      >
                          <Clock size={20} className="text-yellow-500 group-hover:rotate-12 transition-transform"/>
                          <div className="text-left">
                              <span className="block text-sm uppercase tracking-wide">Solicitar Reforço</span>
                              <span className="block text-[10px] font-normal text-zinc-400 group-hover:text-white">Reprogramar continuação para amanhã.</span>
                          </div>
                      </button>
                  </div>

                  <button 
                      onClick={() => setTaskToComplete(null)}
                      className="mt-8 text-zinc-600 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full text-center transition-colors"
                  >
                      Cancelar Relatório
                  </button>
              </div>
          </div>
      )}
      {/* MODAL DE REPLANEJAMENTO */}
      {showRescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-yellow-600 shadow-lg">
                          <RefreshCw size={24} />
                      </div>
                  </div>

                  <div className="text-center mb-8 mt-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Reagrupamento Tático</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                          Identificamos <span className="text-red-500 font-bold">{delayedTasksCount} missões atrasadas</span>.
                          <br/><br/>
                          Deseja redistribuir essas tarefas automaticamente nos próximos dias de estudo para recuperar o atraso sem sobrecarga?
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={confirmReschedule}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                      >
                          <RefreshCw size={18} />
                          CONFIRMAR REPLANEJAMENTO
                      </button>

                      <button 
                          onClick={() => setShowRescheduleModal(false)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700"
                      >
                          MANTER COMO ESTÁ
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* MODAL DE RESET */}
      {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-red-600 shadow-lg">
                          <AlertTriangle size={24} />
                      </div>
                  </div>

                  <div className="text-center mb-8 mt-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Reiniciar Ciclo</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                          Tem certeza que deseja <span className="text-red-500 font-bold">reiniciar todo o progresso</span> do seu plano de estudos?
                          <br/><br/>
                          Todas as missões serão marcadas como não concluídas. Essa ação não pode ser desfeita.
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={confirmResetPlan}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                      >
                          <RefreshCw size={18} className="rotate-180" />
                          CONFIRMAR RESET
                      </button>

                      <button 
                          onClick={() => setShowResetModal(false)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700"
                      >
                          CANCELAR
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* MODAL DE ADIANTAR METAS */}
      {showAdvanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                  
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-blue-600 shadow-lg">
                          <FastForward size={24} />
                      </div>
                  </div>

                  <div className="text-center mb-8 mt-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Adiantar Cronograma</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                          Deseja puxar as missões de amanhã para hoje?
                          <br/><br/>
                          Escolha como o sistema deve reorganizar os dias seguintes.
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={() => handleAdvanceGoals('rest')}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border border-zinc-700 hover:border-green-600 group"
                      >
                          <div className="text-left flex-1 pl-4">
                              <span className="block text-sm uppercase tracking-wide text-green-500 group-hover:text-green-400">Adiantar e Folgar Amanhã</span>
                              <span className="block text-[10px] font-normal text-zinc-400">Traz as metas de amanhã para hoje. Amanhã fica livre.</span>
                          </div>
                      </button>

                      <button 
                          onClick={() => handleAdvanceGoals('shift')}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border border-zinc-700 hover:border-blue-600 group"
                      >
                          <div className="text-left flex-1 pl-4">
                              <span className="block text-sm uppercase tracking-wide text-blue-500 group-hover:text-blue-400">Adiantar Sem Folga</span>
                              <span className="block text-[10px] font-normal text-zinc-400">Puxa toda a fila de estudos. O dia de amanhã será preenchido pelo dia seguinte.</span>
                          </div>
                      </button>

                      <button 
                          onClick={() => setShowAdvanceModal(false)}
                          className="w-full mt-4 text-zinc-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                          Cancelar
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
