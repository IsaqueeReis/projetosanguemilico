
import React, { useState, useEffect } from 'react';
import { MentorshipStorage } from './storage';
import { MentorshipPlan, MentorshipTask, TASK_TYPES, DAYS_OF_WEEK } from './types';
import { Check, X, Clock, AlertTriangle, Shield, RefreshCw, Trash2, AlertCircle } from 'lucide-react';

export const StudentMentorshipPanel = ({ studentId }: { studentId: string }) => {
  const [plan, setPlan] = useState<MentorshipPlan | null>(null);
  const [todayDate] = useState(new Date());
  
  // Estado para o Modal de Conclusão Tática
  const [taskToComplete, setTaskToComplete] = useState<MentorshipTask | null>(null);
  
  const weekDayIndex = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;
  const currentDayName = DAYS_OF_WEEK[weekDayIndex];
  const isoDate = todayDate.toLocaleDateString('pt-BR').split('/').reverse().join('-');

  useEffect(() => {
    loadPlan();
  }, [studentId]);

  const loadPlan = async () => {
      const loadedPlan = await MentorshipStorage.initPlan(studentId, 'Aluno');
      setPlan(loadedPlan);
  };

  // Abre o modal ao invés de concluir direto
  const handleTaskClick = (task: MentorshipTask) => {
      // Se já estiver completa, apenas permite desmarcar (sem modal)
      if (task.isCompleted) {
          toggleTaskStatus(task.id, false);
      } else {
          setTaskToComplete(task);
      }
  };

  const toggleTaskStatus = async (taskId: string, status: boolean) => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map(t => 
      t.id === taskId ? { ...t, isCompleted: status } : t
    );
    const updatedPlan = { ...plan, tasks: updatedTasks };
    setPlan(updatedPlan);
    await MentorshipStorage.savePlan(updatedPlan);
  };

  const handleConfirmCompletion = async (needsMoreTime: boolean) => {
      if (!taskToComplete || !plan) return;

      // 1. Marca a tarefa original como concluída (esforço do dia registrado)
      let updatedTasks = plan.tasks.map(t => 
        t.id === taskToComplete.id ? { ...t, isCompleted: true } : t
      );

      // 2. Se precisa de mais tempo, reprograma para amanhã
      if (needsMoreTime) {
          const tomorrow = new Date(todayDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const tDayIndex = tomorrow.getDay() === 0 ? 6 : tomorrow.getDay() - 1;
          const tDayName = DAYS_OF_WEEK[tDayIndex];
          const tIsoDate = tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-');

          const continuationTask: MentorshipTask = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              dayOfWeek: tDayName,
              date: tIsoDate,
              type: taskToComplete.type,
              subject: taskToComplete.subject,
              description: `${taskToComplete.description} (Reforço/Continuação)`,
              isCompleted: false
          };
          
          updatedTasks = [...updatedTasks, continuationTask];
          alert(`Ciente, soldado! Conteúdo reprogramado para ${tDayName} (${tomorrow.toLocaleDateString('pt-BR')}). O comando aprovou seu reforço.`);
      }

      const updatedPlan = { ...plan, tasks: updatedTasks };
      setPlan(updatedPlan);
      await MentorshipStorage.savePlan(updatedPlan);
      setTaskToComplete(null);
  };

  // Funções de Gestão do Plano
  const handleResetPlan = async () => {
      if (!window.confirm("ATENÇÃO: Isso irá reiniciar seu cronograma a partir de HOJE, mantendo apenas as metas NÃO CUMPRIDAS. As metas já cumpridas serão removidas da visualização. Confirmar reagrupamento?")) return;
      
      const newPlan = await MentorshipStorage.resetPlanPreservingCompleted(studentId);
      if (newPlan) {
          setPlan(newPlan);
          alert("Tropa reagrupada! Seu plano foi reiniciado com as pendências a partir de hoje.");
      }
  };

  const handleClearPlan = async () => {
      if (!window.confirm("PERIGO: Isso irá APAGAR TODO O SEU PLANO DE MENTORIA. Todas as metas e históricos serão perdidos. Confirmar Terra Arrasada?")) return;
      
      const newPlan = await MentorshipStorage.clearPlan(studentId);
      if (newPlan) {
          setPlan(newPlan);
          alert("Plano destruído. Área limpa.");
      }
  };

  if (!plan) return <div className="p-8 text-center text-zinc-500">Carregando dados da missão...</div>;

  const todaysMessage = plan.messages.find(m => m.date === isoDate);
  
  // Lógica para Tarefas de Hoje
  const todaysTasks = plan.tasks.filter(t => {
      if (t.date) return t.date === isoDate;
      return t.dayOfWeek === currentDayName;
  });

  // Lógica para Tarefas Atrasadas (Anteriores a hoje e não cumpridas)
  const overdueTasks = plan.tasks.filter(t => {
      if (!t.date) return false; // Se não tem data específica, assume recorrente semanal (não atrasa do jeito tradicional)
      return t.date < isoDate && !t.isCompleted;
  }).sort((a,b) => (a.date || '').localeCompare(b.date || ''));
  
  const completedCount = todaysTasks.filter(t => t.isCompleted).length;
  const totalCount = todaysTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

        {/* ALERTA DE METAS ATRASADAS */}
        {overdueTasks.length > 0 && (
            <section className="bg-red-900/10 border border-red-600/50 rounded-2xl p-6 animate-pulse-slow">
                <h3 className="text-red-500 font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} /> Retaguarda Comprometida ({overdueTasks.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {overdueTasks.map(task => {
                        const typeInfo = TASK_TYPES.find(t => t.type === task.type);
                        return (
                            <div key={task.id} onClick={() => handleTaskClick(task)} className="bg-zinc-900/80 border border-red-900/30 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:border-red-500 transition group">
                                <div>
                                    <p className="text-white font-bold text-sm">{task.subject}</p>
                                    <p className="text-xs text-red-400">Era para: {new Date(task.date || '').toLocaleDateString('pt-BR')} • {typeInfo?.label}</p>
                                </div>
                                <div className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                                    Pagar Missão
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        )}

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
               <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                 {completedCount}/{totalCount} Concluídas
               </span>
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
                           <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                             {typeInfo?.label}
                           </span>
                         </div>
                         {task.description && <p className={`text-sm mt-1 ${task.isCompleted ? 'text-zinc-600' : 'text-zinc-400'}`}>{task.description}</p>}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </section>

          <div className="space-y-6">
            <section className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-6 h-fit">
                <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Próximos Passos</h3>
                <div className="space-y-4">
                {DAYS_OF_WEEK.map((day, idx) => {
                    if (idx < weekDayIndex) return null;
                    const isToday = day === currentDayName;
                    const targetDate = new Date(todayDate);
                    targetDate.setDate(todayDate.getDate() + (idx - weekDayIndex));
                    const targetIso = targetDate.toLocaleDateString('pt-BR').split('/').reverse().join('-');

                    const tasksForDay = plan.tasks.filter(t => {
                        if (t.date) return t.date === targetIso;
                        return t.dayOfWeek === day;
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
            </section>

            {/* SEÇÃO DE GERENCIAMENTO DO PLANO */}
            <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={12}/> Gestão de Crise (Opções de Plano)
                </h3>
                <div className="space-y-2">
                    <button 
                        onClick={handleResetPlan}
                        className="w-full bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-500 border border-yellow-900/50 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                        <RefreshCw size={14}/> Reagrupar Tropa (Resetar Pendentes)
                    </button>
                    <button 
                        onClick={handleClearPlan}
                        className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                        <Trash2 size={14}/> Terra Arrasada (Limpar Tudo)
                    </button>
                </div>
            </section>
          </div>
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
    </div>
  );
};
