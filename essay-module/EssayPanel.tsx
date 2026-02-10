
import React, { useState, useEffect } from 'react';
import { EssayService } from './service';
import { EssayTopic, EssaySubmission } from './types';
import { PremiumLock } from '../trilha-vencedor/PremiumLock';
import { PenTool, Upload, FileText, CheckCircle, Clock, AlertCircle, Link, ChevronRight, X, Star, Send, Plus, List as ListIcon, Trash2, Archive } from 'lucide-react';

interface Props {
  user: any; // User type
  hasPremium?: boolean; // Prop recebida do pai
}

export const EssayPanel = ({ user, hasPremium = false }: Props) => {
  const [topics, setTopics] = useState<EssayTopic[]>([]);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  
  // Estados de Navegação
  const [activeView, setActiveView] = useState<'LIST' | 'EDITOR' | 'CORRECTION'>('LIST');
  const [selectedTopic, setSelectedTopic] = useState<EssayTopic | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<EssaySubmission | null>(null);
  
  // Estados de Edição (Aluno)
  const [essayContent, setEssayContent] = useState('');
  const [essayFileUrl, setEssayFileUrl] = useState('');
  
  // Estados de Admin
  const [isAdminMode, setIsAdminMode] = useState(user.role === 'ADMIN');
  const [adminTab, setAdminTab] = useState<'CORRECTIONS' | 'TOPICS' | 'HISTORY'>('CORRECTIONS');
  const [adminReviewSub, setAdminReviewSub] = useState<EssaySubmission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);

  // Estados de Criação de Tema (Admin)
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  const canAccess = hasPremium || isAdminMode;
  
  useEffect(() => {
    if (!canAccess) return;
    loadData();
  }, [canAccess]);

  const loadData = async () => {
    const t = await EssayService.getTopics();
    setTopics(t);
    
    if (isAdminMode) {
        const s = await EssayService.getAllSubmissions();
        setSubmissions(s);
    } else {
        const s = await EssayService.getStudentSubmissions(user.id);
        setSubmissions(s);
    }
  };

  const handleStartEssay = (topic: EssayTopic) => {
      setSelectedTopic(topic);
      setActiveView('EDITOR');
      setEssayContent('');
      setEssayFileUrl('');
  };

  const handleSubmit = async () => {
    if (!selectedTopic || (!essayContent && !essayFileUrl)) return alert("Escreva o texto OU envie o link do arquivo.");
    
    await EssayService.submitEssay({
        student_id: user.id,
        student_name: user.name,
        topic_id: selectedTopic.id,
        content_text: essayContent,
        file_url: essayFileUrl,
        status: 'PENDING'
    });
    
    alert("Redação enviada para o comando! Aguarde a correção.");
    setActiveView('LIST');
    loadData();
  };

  const handleViewCorrection = (sub: EssaySubmission) => {
      setViewingSubmission(sub);
      setActiveView('CORRECTION');
  };

  // Admin Actions
  const handleAdminOpenCorrection = (sub: EssaySubmission) => {
      setAdminReviewSub(sub);
      // Se já foi corrigida, carrega os dados
      if (sub.status === 'DONE' && sub.review) {
          setScore(sub.review.final_score);
          setFeedback(sub.review.feedback_text);
      } else {
          setScore(0);
          setFeedback('');
      }
  };

  const handleAdminSubmitCorrection = async () => {
    if (!adminReviewSub) return;
    
    // Passando user.id como mentor_id (obrigatório no SQL)
    await EssayService.submitReview({
        submission_id: adminReviewSub.id,
        mentor_id: user.id, 
        final_score: score,
        feedback_text: feedback,
        competencies_json: {}
    });
    
    alert("Correção enviada ao aluno!");
    setAdminReviewSub(null);
    loadData();
  };

  const handleCreateTopic = async () => {
      if (!newTopicTitle || !newTopicDesc) return alert("Preencha título e descrição do tema.");
      
      await EssayService.createTopic(newTopicTitle, newTopicDesc);
      
      alert("Novo tema disponibilizado para a tropa!");
      setNewTopicTitle('');
      setNewTopicDesc('');
      loadData();
  };

  if (!canAccess) return <div className="relative min-h-screen"><PremiumLock /></div>;

  return (
    <div className="bg-[#09090b] min-h-screen text-zinc-200 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <PenTool className="text-red-600" size={32}/> 
            Redação <span className="text-zinc-600 ml-2 text-xl border-l border-zinc-800 pl-3">Mentoria Tática</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">Envie suas redações e receba correções detalhadas dos oficiais.</p>
        </div>
        
        {isAdminMode && (
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button 
                    onClick={() => setAdminTab('CORRECTIONS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'CORRECTIONS' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <CheckCircle size={14}/> Pendentes
                </button>
                <button 
                    onClick={() => setAdminTab('HISTORY')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'HISTORY' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Archive size={14}/> Redações Recebidas
                </button>
                <button 
                    onClick={() => setAdminTab('TOPICS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'TOPICS' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <ListIcon size={14}/> Gerenciar Temas
                </button>
            </div>
        )}
      </header>

      {/* --- VISÃO DO PROFESSOR (ADMIN) --- */}
      {isAdminMode ? (
        <>
            {/* ABA: CORREÇÕES (PENDENTES) E ABA: HISTÓRICO (RECEBIDAS) */}
            {(adminTab === 'CORRECTIONS' || adminTab === 'HISTORY') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit">
                        <h3 className="text-white font-bold mb-4 uppercase flex items-center gap-2">
                            {adminTab === 'CORRECTIONS' ? <Clock className="text-yellow-500"/> : <Archive className="text-green-500"/>}
                            {adminTab === 'CORRECTIONS' ? 'Envios Pendentes' : 'Redações Recebidas (Corrigidas)'}
                        </h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {submissions.filter(s => adminTab === 'CORRECTIONS' ? s.status === 'PENDING' : s.status === 'DONE').map(sub => (
                                <div key={sub.id} onClick={() => handleAdminOpenCorrection(sub)} className={`p-4 bg-zinc-950 border rounded-lg cursor-pointer transition group ${adminTab === 'HISTORY' ? 'border-zinc-800 hover:border-green-600' : 'border-zinc-800 hover:border-red-600'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-bold transition ${adminTab === 'HISTORY' ? 'text-zinc-300 group-hover:text-green-500' : 'text-white group-hover:text-red-500'}`}>{sub.student_name}</p>
                                            <p className="text-xs text-zinc-500 mt-1">{sub.topic_title}</p>
                                        </div>
                                        {adminTab === 'CORRECTIONS' ? (
                                            <span className="text-[10px] bg-yellow-900/20 text-yellow-500 border border-yellow-900 px-2 py-1 rounded">Corrigir</span>
                                        ) : (
                                            <span className="text-[10px] bg-green-900/20 text-green-500 border border-green-900 px-2 py-1 rounded font-bold">Nota: {sub.review?.final_score}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 flex justify-between">
                                        <span>Enviado: {new Date(sub.created_at).toLocaleDateString()}</span>
                                        {adminTab === 'HISTORY' && sub.review && <span>Corrigido em: {new Date(sub.review.created_at).toLocaleDateString()}</span>}
                                    </p>
                                </div>
                            ))}
                            {submissions.filter(s => adminTab === 'CORRECTIONS' ? s.status === 'PENDING' : s.status === 'DONE').length === 0 && (
                                <p className="text-zinc-500 italic p-4 text-center border border-zinc-800 rounded-lg border-dashed">
                                    {adminTab === 'CORRECTIONS' ? 'Nenhum envio pendente.' : 'Nenhuma redação corrigida ainda.'}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* PAINEL DE CORREÇÃO / VISUALIZAÇÃO */}
                    {adminReviewSub ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in sticky top-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold">
                                    {adminReviewSub.status === 'DONE' ? 'Visualizando Correção:' : 'Corrigindo:'} {adminReviewSub.student_name}
                                </h3>
                                <button onClick={() => setAdminReviewSub(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            {adminReviewSub.file_url && (
                                <a href={adminReviewSub.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-4 text-blue-400 hover:text-blue-300 bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                                    <Link size={16}/> Ver Arquivo do Aluno
                                </a>
                            )}
                            
                            <div className="bg-zinc-950 p-4 rounded-lg mb-4 text-sm text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap border border-zinc-800 font-serif">
                                {adminReviewSub.content_text || "Texto não fornecido (Apenas arquivo)."}
                            </div>
                            
                            <div className="space-y-4 pt-4 border-t border-zinc-800">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Nota Final (0-100)</label>
                                    <input 
                                        type="number" 
                                        value={score} 
                                        onChange={e => setScore(Number(e.target.value))} 
                                        disabled={adminReviewSub.status === 'DONE'}
                                        className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white mt-1 outline-none focus:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Feedback Detalhado</label>
                                    <textarea 
                                        value={feedback} 
                                        onChange={e => setFeedback(e.target.value)} 
                                        disabled={adminReviewSub.status === 'DONE'}
                                        className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white h-32 mt-1 outline-none focus:border-green-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                {adminReviewSub.status !== 'DONE' && (
                                    <button onClick={handleAdminSubmitCorrection} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                                        <CheckCircle size={18}/> Enviar Correção
                                    </button>
                                )}
                                {adminReviewSub.status === 'DONE' && (
                                    <div className="p-3 bg-green-900/20 border border-green-900 rounded text-green-500 text-center text-sm font-bold flex items-center justify-center gap-2">
                                        <CheckCircle size={16}/> Correção Enviada
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-center text-zinc-500 italic">
                            Selecione uma redação ao lado para {adminTab === 'CORRECTIONS' ? 'corrigir' : 'visualizar'}.
                        </div>
                    )}
                </div>
            )}

            {/* ABA: GERENCIAR TEMAS */}
            {adminTab === 'TOPICS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit shadow-lg">
                        <h3 className="text-white font-bold mb-6 uppercase flex items-center gap-2 text-sm tracking-wide">
                            <Plus className="text-red-500"/> Novo Tema de Redação
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase">Título do Tema</label>
                                <input 
                                    type="text" 
                                    value={newTopicTitle}
                                    onChange={e => setNewTopicTitle(e.target.value)}
                                    placeholder="Ex: A importância da Segurança Pública..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white mt-1 outline-none focus:border-red-600 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase">Texto Motivador e Critérios</label>
                                <textarea 
                                    value={newTopicDesc}
                                    onChange={e => setNewTopicDesc(e.target.value)}
                                    placeholder="Insira os textos de apoio, instruções e critérios de correção aqui..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white h-64 mt-1 outline-none focus:border-red-600 resize-none text-sm leading-relaxed"
                                />
                            </div>
                            <button 
                                onClick={handleCreateTopic}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-red-900/20"
                            >
                                <Plus size={18}/> Cadastrar Tema
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-white font-bold mb-6 uppercase flex items-center gap-2 text-sm tracking-wide">
                            <ListIcon className="text-zinc-500"/> Temas Ativos ({topics.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {topics.map(topic => (
                                <div key={topic.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-lg flex flex-col gap-3 group hover:border-zinc-700 transition">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-white font-bold text-lg">{topic.title}</h4>
                                        <span className="text-[10px] bg-green-900/20 text-green-500 border border-green-900/50 px-2 py-1 rounded">Ativo</span>
                                    </div>
                                    <p className="text-zinc-400 text-sm line-clamp-3 leading-relaxed">{topic.description}</p>
                                    <div className="pt-3 border-t border-zinc-900 flex justify-end">
                                        {/* Futuramente: Botão de Arquivar/Excluir */}
                                        <span className="text-[10px] text-zinc-600 font-mono">ID: {topic.id.substring(0, 8)}...</span>
                                    </div>
                                </div>
                            ))}
                            {topics.length === 0 && (
                                <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                    Nenhum tema cadastrado. Crie o primeiro ao lado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
      ) : (
        
      /* --- VISÃO DO ALUNO --- */
      <div className="space-y-8">
          
          {/* VISUALIZAÇÃO: LISTA (PADRÃO) */}
          {activeView === 'LIST' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                
                {/* COLUNA 1: NOVO ENVIO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                            <PenTool size={16} className="text-red-500"/> Novo Envio
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                        {topics.map(topic => (
                            <div key={topic.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg hover:border-red-600 transition group relative">
                                <div className="pr-20">
                                    <h4 className="font-bold text-white text-sm mb-1">{topic.title}</h4>
                                    <p className="text-xs text-zinc-500 line-clamp-2">{topic.description}</p>
                                </div>
                                <button 
                                    onClick={() => handleStartEssay(topic)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                >
                                    Escrever <ChevronRight size={14}/>
                                </button>
                            </div>
                        ))}
                        {topics.length === 0 && <p className="text-zinc-500 text-center py-8 text-sm">Nenhum tema disponível no momento.</p>}
                    </div>
                </div>

                {/* COLUNA 2: HISTÓRICO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-white font-bold uppercase text-sm tracking-wide flex items-center gap-2">
                            <Clock size={16} className="text-blue-500"/> Histórico de Redações
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                        {submissions.map(sub => {
                            const isDone = sub.status === 'DONE';
                            return (
                                <div key={sub.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="font-bold text-white text-sm mb-1">{sub.topic_title}</p>
                                        <p className="text-[10px] text-zinc-500">Enviado em {new Date(sub.created_at).toLocaleDateString()}</p>
                                    </div>
                                    
                                    {isDone ? (
                                        <button 
                                            onClick={() => handleViewCorrection(sub)}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 shadow-lg shadow-green-900/20 transition w-full sm:w-auto justify-center"
                                        >
                                            <CheckCircle size={14}/> Ver Devolutiva
                                        </button>
                                    ) : (
                                        <span className="bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 text-[10px] font-bold px-3 py-1 rounded flex items-center gap-2 w-full sm:w-auto justify-center">
                                            <Clock size={12}/> Aguardando Correção
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {submissions.length === 0 && <p className="text-zinc-500 text-center py-8 text-sm">Você ainda não enviou nenhuma redação.</p>}
                    </div>
                </div>
            </div>
          )}

          {/* VISUALIZAÇÃO: EDITOR */}
          {activeView === 'EDITOR' && selectedTopic && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <PenTool size={20} className="text-red-500"/> Escrever Redação
                      </h2>
                      <button onClick={() => setActiveView('LIST')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-sm font-bold">
                          <X size={16}/> Cancelar
                      </button>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-6">
                      <h3 className="text-red-500 font-bold text-sm uppercase mb-2">Tema Proposto</h3>
                      <p className="text-lg font-bold text-white mb-2">{selectedTopic.title}</p>
                      <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap font-serif border-t border-zinc-900 pt-2 mt-2">
                          {selectedTopic.description}
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Texto da Redação</label>
                          <textarea 
                              value={essayContent}
                              onChange={e => setEssayContent(e.target.value)}
                              placeholder="Digite seu texto aqui..."
                              className="w-full h-80 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-200 outline-none focus:border-red-600 resize-none font-serif leading-relaxed text-base"
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ou Link do Arquivo (PDF/Imagem)</label>
                          <div className="flex gap-2">
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-zinc-500">
                                  <Link size={18}/>
                              </div>
                              <input 
                                  type="text" 
                                  value={essayFileUrl}
                                  onChange={e => setEssayFileUrl(e.target.value)}
                                  placeholder="Cole aqui o link do Google Drive..."
                                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-red-600 text-sm"
                              />
                          </div>
                      </div>

                      <div className="flex justify-end pt-4">
                          <button 
                              onClick={handleSubmit}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105"
                          >
                              <Send size={18}/> Enviar para Correção
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* VISUALIZAÇÃO: CORREÇÃO (DEVOLUTIVA) */}
          {activeView === 'CORRECTION' && viewingSubmission && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-4xl mx-auto animate-fade-in shadow-2xl">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                      <h2 className="text-xl font-bold text-green-500 flex items-center gap-2">
                          <CheckCircle size={24}/> Devolutiva da Redação
                      </h2>
                      <button onClick={() => setActiveView('LIST')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-sm font-bold">
                          <X size={16}/> Fechar
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 text-center">
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Nota Final</p>
                          <div className="text-5xl font-black text-white mb-2">{viewingSubmission.review?.final_score}</div>
                          <div className="flex justify-center gap-1 text-yellow-500">
                              {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= (viewingSubmission.review?.final_score || 0)/20 ? "currentColor" : "none"} />)}
                          </div>
                      </div>
                      
                      <div className="md:col-span-2 bg-green-900/10 border border-green-900/30 p-6 rounded-xl">
                          <p className="text-green-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                              <PenTool size={14}/> Feedback do Professor
                          </p>
                          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {viewingSubmission.review?.feedback_text}
                          </p>
                      </div>
                  </div>

                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Seu Texto Original</p>
                      <div className="text-zinc-400 text-sm font-serif leading-relaxed whitespace-pre-wrap">
                          {viewingSubmission.content_text || "Texto enviado via arquivo."}
                      </div>
                      {viewingSubmission.file_url && (
                          <div className="mt-4 pt-4 border-t border-zinc-800">
                              <a href={viewingSubmission.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-bold">
                                  <Link size={14}/> Visualizar Arquivo Enviado
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>
      )}
    </div>
  );
};
