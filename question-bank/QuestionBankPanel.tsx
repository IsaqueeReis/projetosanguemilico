
import React, { useState, useEffect } from 'react';
import { Filter, Play, CheckCircle, XCircle, Video, Book, AlertCircle, Search, RefreshCw, ChevronDown, ChevronUp, Crosshair, Target, Shield, Skull, BarChart2, Plus, Bookmark, List, Trash2, FolderOpen, Calendar } from 'lucide-react';
import { QBQuestion, QBFilters, Difficulty, QuestionType, QBNotebook } from './types';
import { QuestionBankService } from './service';
import { supabase } from '../services/supabase';
import { QuestionPieChart, EvolutionChart, PrecisionWaveChart } from '../components/ui/Charts';

export const QuestionBankPanel = ({ studentId }: { studentId: string }) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'QUESTIONS' | 'PERFORMANCE' | 'NOTEBOOKS'>('QUESTIONS');

  // Common State
  const [questions, setQuestions] = useState<QBQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Question Execution State
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [resolution, setResolution] = useState<{comment_text: string, video_url?: string} | null>(null);
  const [loadingResolution, setLoadingResolution] = useState(false);

  // Notebooks State
  const [notebooks, setNotebooks] = useState<QBNotebook[]>([]);
  const [showNotebookModal, setShowNotebookModal] = useState(false); // Modal to add question
  const [newNotebookName, setNewNotebookName] = useState('');
  const [selectedNotebookForFilter, setSelectedNotebookForFilter] = useState<string | null>(null);

  // Filter Options Data
  const [filterOptions, setFilterOptions] = useState<{
      disciplines: string[];
      boards: string[];
      organs: string[];
      roles: string[];
      subjects: string[];
      sub_subjects: string[];
      sources: string[];
  }>({ disciplines: [], boards: [], organs: [], roles: [], subjects: [], sub_subjects: [], sources: [] });

  // Filters State
  const [showFilters, setShowFilters] = useState(true);
  const [stats, setStats] = useState({ total: 0, accuracy: 0, correct: 0, history: [] as any[] });
  const [filters, setFilters] = useState<QBFilters>({
    discipline: '',
    board: '',
    organ: '',
    role: '',
    subject: '',
    sub_subject: '',
    source: '',
    year: undefined,
    difficulty: undefined,
    type: undefined,
    keyword: '',
    only_mistakes: false,
    notebookId: undefined
  });

  // Estado para filtro de data do gráfico de precisão
  const [precisionDateFilter, setPrecisionDateFilter] = useState<{ start: string; end: string }>({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Últimos 30 dias por padrão
      end: new Date().toISOString().split('T')[0]
  });

  // Load Initial Data
  useEffect(() => {
    loadQuestions(); // Load initial batch
    loadStats();
    loadFilterOptions();
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
      const nb = await QuestionBankService.getUserNotebooks(studentId);
      setNotebooks(nb);
  };

  const loadFilterOptions = async () => {
      const { data } = await supabase.from('qb_questions').select('discipline, board, organ, role, subject, sub_subject, source').eq('is_active', true);
      if (data) {
          const unique = (key: string): string[] => {
              const values = (data as any[]).map((item: any) => item[key]);
              // Filter to ensure only strings are returned and remove nulls/undefined/non-strings
              const stringValues = values.filter((v: any): v is string => typeof v === 'string' && v.length > 0);
              return [...new Set(stringValues)].sort();
          };

          setFilterOptions({
              disciplines: unique('discipline'),
              boards: unique('board'),
              organs: unique('organ'),
              roles: unique('role'),
              subjects: unique('subject'),
              sub_subjects: unique('sub_subject'),
              sources: unique('source')
          });
      }
  };

  const loadQuestions = async (overrideFilters?: QBFilters) => {
    setLoading(true);
    const filtersToUse = overrideFilters || filters;
    const cleanFilters: QBFilters = {};
    
    // Cleaning empty filters
    Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== false) {
            // @ts-ignore
            cleanFilters[key] = value;
        }
    });

    const data = await QuestionBankService.fetchQuestions(cleanFilters, studentId);
    setQuestions(data);
    setCurrentIndex(0);
    resetQuestionState();
    setLoading(false);
    if(window.innerWidth < 768) setShowFilters(false);
  };

  const loadStats = async () => {
    const s = await QuestionBankService.getUserStats(studentId);
    // @ts-ignore
    setStats(s);
  };

  const resetQuestionState = () => {
    setSelectedAlt(null);
    setIsAnswered(false);
    setResolution(null);
    setLoadingResolution(false);
  };

  const handleAnswer = async () => {
    if (!selectedAlt || isAnswered) return;
    const currentQ = questions[currentIndex];
    const isCorrect = currentQ.alternatives.find(a => a.id === selectedAlt)?.is_correct || false;
    setIsAnswered(true);
    
    await QuestionBankService.submitAnswer(studentId, {
        question_id: currentQ.id,
        selected_alternative_id: selectedAlt,
        is_correct: isCorrect,
        time_spent_seconds: 0
    });
    loadStats();
  };

  const fetchResolution = async () => {
    if (resolution) return;
    setLoadingResolution(true);
    const resData = await QuestionBankService.fetchResolution(questions[currentIndex].id);
    setResolution(resData || { comment_text: "O comando não disponibilizou o gabarito comentado para esta missão." });
    setLoadingResolution(false);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetQuestionState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (key: keyof QBFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- Notebook Logic ---
  const handleCreateNotebook = async () => {
      if (!newNotebookName) return;
      await QuestionBankService.createNotebook(studentId, newNotebookName);
      setNewNotebookName('');
      loadNotebooks();
  };

  const handleAddToNotebook = async (notebookId: string) => {
      const currentQ = questions[currentIndex];
      if(!currentQ) return;
      await QuestionBankService.addQuestionToNotebook(studentId, notebookId, currentQ.id);
      setShowNotebookModal(false);
      alert('Questão adicionada ao caderno com sucesso!');
      loadNotebooks(); // Refresh counts
  };

  const handleDeleteNotebook = async (notebookId: string) => {
      if(!window.confirm('Tem certeza que deseja excluir este caderno?')) return;
      await QuestionBankService.deleteNotebook(studentId, notebookId);
      loadNotebooks();
      if(selectedNotebookForFilter === notebookId) {
          setSelectedNotebookForFilter(null);
          setFilters(prev => ({...prev, notebookId: undefined}));
          loadQuestions({...filters, notebookId: undefined});
      }
  };

  const openNotebook = (notebookId: string) => {
      setSelectedNotebookForFilter(notebookId);
      const newFilters = { ...filters, notebookId: notebookId, only_mistakes: false }; // Reset other special filters
      setFilters(newFilters);
      setActiveTab('QUESTIONS');
      loadQuestions(newFilters);
  };

  const currentQ = questions[currentIndex];

  // Processamento de dados para o gráfico de ondas (Precisão Global)
  const accuracyWaveData = React.useMemo(() => {
      if (!stats.history || stats.history.length === 0) return [];
      
      const grouped: Record<string, { total: number, correct: number }> = {};
      
      // Datas de filtro
      const startDate = precisionDateFilter.start ? new Date(precisionDateFilter.start) : null;
      const endDate = precisionDateFilter.end ? new Date(precisionDateFilter.end) : null;
      
      // Ajuste para incluir o final do dia na data final
      if (endDate) endDate.setHours(23, 59, 59, 999);

      // Agrupar por data com filtro
      stats.history.forEach((h: any) => {
          const itemDate = new Date(h.created_at);
          
          // Aplicar Filtro de Data
          if (startDate && itemDate < startDate) return;
          if (endDate && itemDate > endDate) return;

          const dateStr = itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!grouped[dateStr]) grouped[dateStr] = { total: 0, correct: 0 };
          grouped[dateStr].total++;
          if (h.is_correct) grouped[dateStr].correct++;
      });

      // Transformar em array e calcular porcentagem
      // Ordena pelas chaves (datas) pode ser necessário dependendo de como as keys são geradas, mas o sort do gráfico cuida disso ou o input original
      return Object.keys(grouped).map(date => ({
          date,
          accuracy: Math.round((grouped[date].correct / grouped[date].total) * 100)
      }));
  }, [stats.history, precisionDateFilter]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-4 lg:p-8 font-sans">
      
      {/* Header */}
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Crosshair className="text-red-600" size={32}/> 
            CAMPO DE <span className="text-red-600">TIRO</span>
        </h1>
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Treinamento Intensivo de Questões</p>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('QUESTIONS')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'QUESTIONS' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <List size={18}/> Questões
            </button>
            <button 
                onClick={() => setActiveTab('NOTEBOOKS')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'NOTEBOOKS' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <Book size={18}/> Cadernos de Erros
            </button>
            <button 
                onClick={() => setActiveTab('PERFORMANCE')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'PERFORMANCE' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <BarChart2 size={18}/> Desempenho
            </button>
        </div>
      </header>

      {/* --- TAB: QUESTÕES --- */}
      {activeTab === 'QUESTIONS' && (
          <div className="animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl mb-8 overflow-hidden shadow-lg">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex justify-between items-center p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                    <span className="font-bold text-sm uppercase flex items-center gap-2 text-zinc-300">
                        <Search size={16} /> 
                        {selectedNotebookForFilter ? `Filtrando pelo Caderno: ${notebooks.find(n => n.id === selectedNotebookForFilter)?.name}` : 'Parâmetros da Missão (Filtros)'}
                    </span>
                    {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showFilters && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0c0c0e]">
                        {selectedNotebookForFilter && (
                            <div className="col-span-4 bg-red-900/20 border border-red-600 p-3 rounded flex justify-between items-center mb-2">
                                <span className="text-red-200 text-sm font-bold flex items-center gap-2"><Book size={16}/> Você está resolvendo o caderno: {notebooks.find(n => n.id === selectedNotebookForFilter)?.name}</span>
                                <button onClick={() => { setSelectedNotebookForFilter(null); setFilters(prev => ({...prev, notebookId: undefined})); }} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Sair do Caderno</button>
                            </div>
                        )}

                        <input 
                            placeholder="Busca tática (palavra-chave)..." 
                            className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-950 border border-zinc-800 p-3 rounded text-sm text-white focus:border-red-600 outline-none uppercase placeholder:normal-case"
                            value={filters.keyword}
                            onChange={e => handleFilterChange('keyword', e.target.value)}
                        />
                        
                        {/* SELECTS POPULADOS COM DADOS REAIS */}
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Disciplina</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.discipline}
                                onChange={e => handleFilterChange('discipline', e.target.value)}
                            >
                                <option value="">Todas</option>
                                {filterOptions.disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Banca</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.board}
                                onChange={e => handleFilterChange('board', e.target.value)}
                            >
                                <option value="">Todas</option>
                                {filterOptions.boards.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Órgão</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.organ}
                                onChange={e => handleFilterChange('organ', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.organs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Cargo</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.role}
                                onChange={e => handleFilterChange('role', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.roles.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Assunto</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.subject}
                                onChange={e => handleFilterChange('subject', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.subjects.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Subassunto</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.sub_subject}
                                onChange={e => handleFilterChange('sub_subject', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.sub_subjects.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Ano</label>
                            <input 
                                type="number"
                                placeholder="Ex: 2024"
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.year || ''}
                                onChange={e => handleFilterChange('year', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Dificuldade</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.difficulty || ''}
                                onChange={e => handleFilterChange('difficulty', e.target.value || undefined)}
                            >
                                <option value="">Todas</option>
                                <option value="EASY">Fácil (Recruta)</option>
                                <option value="MEDIUM">Médio (Padrão)</option>
                                <option value="HARD">Difícil (Caveira)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.type || ''}
                                onChange={e => handleFilterChange('type', e.target.value || undefined)}
                            >
                                <option value="">Todos</option>
                                <option value="ABCDE">Múltipla Escolha (ABCDE)</option>
                                <option value="ABCD">Múltipla Escolha (ABCD)</option>
                                <option value="CERTO_ERRADO">Certo / Errado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Fonte</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.source}
                                onChange={e => handleFilterChange('source', e.target.value)}
                            >
                                <option value="">Todas</option>
                                {filterOptions.sources.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                            <button 
                                onClick={() => loadQuestions()}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 uppercase tracking-wider"
                            >
                                <Filter size={18} /> Executar Varredura (Aplicar)
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Question Display */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse text-zinc-500">
                    <RefreshCw size={40} className="animate-spin mb-4 text-red-600"/>
                    <p className="uppercase tracking-widest font-bold">Carregando munição tática...</p>
                </div>
            ) : currentQ ? (
                <div className="max-w-4xl mx-auto">
                    {/* Metadata Badges & Tools */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2 flex-wrap">
                            <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{currentQ.board}</span>
                            {currentQ.organ && <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{currentQ.organ}</span>}
                            {currentQ.role && <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{currentQ.role}</span>}
                            <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{currentQ.year}</span>
                            <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{currentQ.discipline}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${currentQ.difficulty === 'HARD' ? 'bg-red-900/30 text-red-500 border-red-900' : currentQ.difficulty === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900' : 'bg-green-900/30 text-green-500 border-green-900'}`}>{currentQ.difficulty === 'EASY' ? 'Fácil' : currentQ.difficulty === 'MEDIUM' ? 'Médio' : 'Difícil'}</span>
                        </div>
                        <button 
                            onClick={() => setShowNotebookModal(true)}
                            className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs font-bold uppercase transition bg-zinc-900 border border-zinc-800 px-3 py-1 rounded hover:bg-zinc-800"
                        >
                            <Bookmark size={14}/> + Caderno
                        </button>
                    </div>

                    {/* Question Card */}
                    <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl bg-[#0c0c0e]">
                        {/* Statement */}
                        <div className="bg-zinc-900/50 p-6 md:p-8 border-b border-zinc-800">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Alvo {currentIndex + 1} de {questions.length}</span>
                                {currentQ.source && <span className="text-[10px] text-zinc-600 uppercase font-mono">Fonte: {currentQ.source}</span>}
                            </div>
                            <p className="text-lg text-zinc-200 leading-relaxed font-serif whitespace-pre-wrap">
                                {currentQ.statement}
                            </p>
                        </div>

                        {/* Alternatives */}
                        <div className="bg-[#0c0c0e] p-6 space-y-3">
                            {currentQ.alternatives.map(alt => {
                                let statusClass = "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900";
                                
                                if (isAnswered) {
                                    if (alt.is_correct) statusClass = "bg-green-900/20 border-green-600 text-green-400"; // Correta sempre verde
                                    else if (selectedAlt === alt.id && !alt.is_correct) statusClass = "bg-red-900/20 border-red-600 text-red-400 opacity-80"; // Errada selecionada
                                    else statusClass = "opacity-40 border-zinc-800 grayscale"; // Outras
                                } else if (selectedAlt === alt.id) {
                                    statusClass = "bg-zinc-800 border-red-600 text-white shadow-lg"; // Selecionada antes de enviar
                                }

                                return (
                                    <button
                                        key={alt.id}
                                        disabled={isAnswered}
                                        onClick={() => setSelectedAlt(alt.id)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex gap-4 items-start ${statusClass}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isAnswered && alt.is_correct ? 'bg-green-600 border-green-600 text-white' : 'border-zinc-600 text-zinc-500'}`}>
                                            {alt.label}
                                        </div>
                                        <span className="flex-1">{alt.text}</span>
                                        {isAnswered && alt.is_correct && <CheckCircle size={20} className="flex-shrink-0 text-green-500" />}
                                        {isAnswered && selectedAlt === alt.id && !alt.is_correct && <XCircle size={20} className="flex-shrink-0 text-red-500" />}
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="bg-zinc-900/80 p-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                            {!isAnswered ? (
                                <button 
                                    onClick={handleAnswer}
                                    disabled={!selectedAlt}
                                    className={`w-full md:w-auto px-10 py-3 rounded-lg font-bold text-white transition-all shadow-lg uppercase tracking-wider ${selectedAlt ? 'bg-red-600 hover:bg-red-700 transform hover:scale-105' : 'bg-zinc-800 cursor-not-allowed text-zinc-500'}`}
                                >
                                    Confirmar Disparo
                                </button>
                            ) : (
                                <div className="w-full flex flex-col md:flex-row gap-4 justify-end">
                                    {!resolution ? (
                                        <button 
                                            onClick={fetchResolution}
                                            disabled={loadingResolution}
                                            className="px-6 py-3 rounded-lg font-bold border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-wide"
                                        >
                                            {loadingResolution ? <RefreshCw className="animate-spin" size={18}/> : <Book size={18}/>}
                                            Solicitar Apoio (Comentário)
                                        </button>
                                    ) : null}
                                    
                                    <button 
                                        onClick={nextQuestion}
                                        className="px-8 py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 uppercase tracking-wide"
                                    >
                                        Próximo Alvo <Play size={18} fill="currentColor"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resolution Display (Conditional) */}
                    {resolution && (
                        <div className="mt-6 bg-[#0c0c0e] border border-yellow-500/30 rounded-xl overflow-hidden animate-slide-in shadow-2xl">
                            <div className="bg-yellow-900/10 p-4 border-b border-yellow-500/30 flex items-center gap-2">
                                <Shield className="text-yellow-500" size={20}/>
                                <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-wider">Briefing Tático (Resolução)</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-serif text-lg">{resolution.comment_text}</p>
                                
                                {resolution.video_url && (
                                    <div className="mt-6 pt-6 border-t border-zinc-800">
                                        <a href={resolution.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-blue-400 hover:text-blue-300 font-bold bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-900/50 hover:border-blue-500 transition-colors uppercase text-sm">
                                            <Video size={20}/> Vídeo de Instrução
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20 text-zinc-500 flex flex-col items-center border-2 border-dashed border-zinc-800 rounded-xl bg-[#0c0c0e]">
                    <Target size={48} className="mb-4 text-zinc-700"/>
                    <p className="mb-2 text-xl font-bold text-zinc-400 uppercase tracking-widest">Área Limpa</p>
                    <p className="text-sm">Nenhum alvo encontrado com os parâmetros atuais.</p>
                    <button onClick={() => setShowFilters(true)} className="mt-4 text-red-500 font-bold hover:underline uppercase text-xs">Reconfigurar Parâmetros</button>
                </div>
            )}
          </div>
      )}

      {/* --- TAB: CADERNOS DE ERROS --- */}
      {activeTab === 'NOTEBOOKS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
              {/* Left Col: List */}
              <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-fit">
                  <h3 className="text-white font-bold uppercase text-sm mb-4 flex items-center gap-2"><Book size={16}/> Meus Cadernos</h3>
                  
                  {/* Create New */}
                  <div className="flex gap-2 mb-6">
                      <input 
                          value={newNotebookName}
                          onChange={e => setNewNotebookName(e.target.value)}
                          placeholder="Novo Caderno..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white outline-none focus:border-red-600"
                      />
                      <button onClick={handleCreateNotebook} className="bg-red-600 text-white p-2 rounded hover:bg-red-700"><Plus size={18}/></button>
                  </div>

                  {/* List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {notebooks.map(nb => (
                          <div key={nb.id} className="group flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-600 transition">
                              <div onClick={() => openNotebook(nb.id)} className="cursor-pointer flex-1">
                                  <p className="font-bold text-sm text-zinc-200 group-hover:text-white">{nb.name}</p>
                                  <p className="text-xs text-zinc-500">{nb.questionIds.length} questões</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => openNotebook(nb.id)} className="text-zinc-500 hover:text-green-500" title="Abrir"><Play size={16}/></button>
                                  <button onClick={() => handleDeleteNotebook(nb.id)} className="text-zinc-500 hover:text-red-500" title="Excluir"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                      {notebooks.length === 0 && <p className="text-zinc-500 text-xs text-center italic py-4">Nenhum caderno criado.</p>}
                  </div>
              </div>

              {/* Right Col: Instructions */}
              <div className="md:col-span-2 bg-[#0c0c0e] border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <Book size={48} className="text-zinc-700 mb-4"/>
                  <h2 className="text-xl font-bold text-white mb-2 uppercase">Gestão de Cadernos</h2>
                  <p className="text-zinc-400 text-sm max-w-md">
                      Crie cadernos personalizados para organizar seus erros ou tópicos prioritários.
                      Para adicionar uma questão, clique no ícone <span className="inline-flex items-center gap-1 bg-zinc-800 px-1 rounded text-xs font-bold text-white"><Bookmark size={10}/> + CADERNO</span> presente no cartão da questão durante a resolução.
                  </p>
                  <button onClick={() => setActiveTab('QUESTIONS')} className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded font-bold uppercase text-xs tracking-wide">
                      Ir para Questões
                  </button>
              </div>
          </div>
      )}

      {/* --- TAB: DESEMPENHO --- */}
      {activeTab === 'PERFORMANCE' && (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* General Stats */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center justify-center">
                      <div className="w-full flex justify-between items-center mb-4">
                          <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Desempenho</h3>
                          <div className="flex gap-2">
                              <div className="relative">
                                  <input 
                                      type="date" 
                                      className="bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 outline-none focus:border-red-600"
                                      value={precisionDateFilter.start}
                                      onChange={(e) => setPrecisionDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                  />
                              </div>
                              <div className="relative">
                                  <input 
                                      type="date" 
                                      className="bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 outline-none focus:border-red-600"
                                      value={precisionDateFilter.end}
                                      onChange={(e) => setPrecisionDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="w-full h-40">
                          <PrecisionWaveChart data={accuracyWaveData} />
                      </div>
                      <p className="text-2xl font-black text-white mt-4">{stats.accuracy.toFixed(1)}%</p>
                      <p className="text-zinc-500 text-xs">de aproveitamento médio</p>
                  </div>

                  {/* Volume */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-center">
                      <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-6">Volume de Fogo</h3>
                      <div className="space-y-4">
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Questões Resolvidas</span>
                                  <span className="text-white font-bold">{stats.total}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{width: '100%'}}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Acertos</span>
                                  <span className="text-green-500 font-bold">{stats.correct}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-green-600" style={{width: `${stats.accuracy}%`}}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Erros</span>
                                  <span className="text-red-500 font-bold">{stats.total - stats.correct}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-red-600" style={{width: `${100 - stats.accuracy}%`}}></div></div>
                          </div>
                      </div>
                  </div>

                  {/* Evolution (Placeholder for now as existing data structure in stats might be simple) */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                      <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Evolução Recente</h3>
                      {stats.history && stats.history.length > 0 ? (
                          <div className="h-40">
                              {/* Reuse generic chart or simple list */}
                              <div className="space-y-2">
                                  {stats.history.slice(-5).reverse().map((h: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-1">
                                          <span className="text-zinc-500">{new Date(h.created_at).toLocaleDateString()}</span>
                                          <span className={`font-bold ${h.is_correct ? 'text-green-500' : 'text-red-500'}`}>{h.is_correct ? 'ACERTO' : 'ERRO'}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <p className="text-zinc-600 text-xs italic">Sem dados suficientes para gerar gráfico de evolução.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: Add to Notebook */}
      {showNotebookModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold uppercase text-sm">Adicionar ao Caderno</h3>
                      <button onClick={() => setShowNotebookModal(false)}><XCircle className="text-zinc-500 hover:text-white"/></button>
                  </div>
                  
                  {/* Create New Inside Modal */}
                  <div className="flex gap-2 mb-4">
                      <input 
                          value={newNotebookName}
                          onChange={e => setNewNotebookName(e.target.value)}
                          placeholder="Criar novo..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white outline-none focus:border-red-600"
                      />
                      <button onClick={handleCreateNotebook} className="bg-zinc-800 text-white p-2 rounded hover:bg-zinc-700 border border-zinc-700"><Plus size={18}/></button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notebooks.map(nb => (
                          <button 
                              key={nb.id} 
                              onClick={() => handleAddToNotebook(nb.id)}
                              className="w-full text-left p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-red-600 transition flex justify-between items-center group"
                          >
                              <span className="font-bold text-zinc-300 group-hover:text-white text-sm">{nb.name}</span>
                              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{nb.questionIds.length} Qs</span>
                          </button>
                      ))}
                      {notebooks.length === 0 && <p className="text-zinc-500 text-xs text-center italic">Nenhum caderno disponível.</p>}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
