
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Subject, ScheduleItem, DailyGoal, RevisionItem, Simulado, Material, Achievement, SimuladoResult, StudySession, QuestionStats, EditalSubject, EditalProgress, Edital, EditalTopic, Plan, SimuladoQuestion } from './types';
import { getStorage, setStorage, checkDailyReset } from './services/storage'; 
import { globalRepo, userProgressRepo } from './services/repository';
import { supabase } from './services/supabase';
import { createClient } from '@supabase/supabase-js'; 
import { LogOut, UserIcon, ShieldAlert, BookOpen, BarChart2, Calendar, Target, Award, CheckCircle, MessageCircle, Upload, LayoutDashboard, FileText, CheckSquare, Clock, Trash2, Plus, Pause, Play, GraduationCap, Scale, Users, Bold, Italic, Type, Highlighter, Eye, Search, Video, Edit3, XCircle, TrendingUp, Sun, Moon, Minus, Palette, ArrowUp, ArrowDown, History, StopCircle, Menu, Lock, Megaphone, Bell, Folder, RefreshCw, Eraser, List, Trophy, Crown, Zap, Flame, LayoutList, Image as ImageIcon, Camera, ChevronRight, CornerDownRight, Link as LinkIcon, Gavel, Calculator, Cpu, Book, PenTool, LayoutList as ListIcon, Star, Quote, Settings, ChevronLeft, Map, Check, HelpCircle, Activity, Medal, Layers, ChevronDown, Database } from './components/ui/Icons';
import { StudyHoursChart, QuestionPieChart, StudyDistributionChart } from './components/ui/Charts';
import TrilhaVencedor from './trilha-vencedor/TrilhaVencedor';
import { AdminMentorshipPanel } from './mentoria-individual/AdminPanel';
import { StudentMentorshipPanel } from './mentoria-individual/StudentPanel';
import { MentorshipStorage } from './mentoria-individual/storage';
import { PremiumLock } from './trilha-vencedor/PremiumLock';
import { QuestionBankPanel } from './question-bank/QuestionBankPanel';
import { EssayPanel } from './essay-module/EssayPanel';
import { AdminQuestionManager } from './question-bank/AdminQuestionManager';
import { FlashcardPanel } from './flashcards/FlashcardPanel';
import { AdminFlashcardPanel } from './flashcards/AdminFlashcardPanel';

const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};

const getLocalISODate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
};

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 300; 
                const scaleSize = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const getSubjectIcon = (subjectName: any, className: string = "", size: number = 20) => {
    const s = (typeof subjectName === 'string' ? subjectName : "").toLowerCase();
    if (s.includes('direito') || s.includes('legislação') || s.includes('lei') || s.includes('penal') || s.includes('constitucional')) return <Gavel className={className} size={size} />;
    if (s.includes('matemática') || s.includes('raciocínio') || s.includes('exatas') || s.includes('estatística')) return <Calculator className={className} size={size} />;
    if (s.includes('informática') || s.includes('computador') || s.includes('t.i')) return <Cpu className={className} size={size} />;
    if (s.includes('português') || s.includes('língua') || s.includes('literatura')) return <Book className={className} size={size} />;
    if (s.includes('redação') || s.includes('escrita')) return <PenTool className={className} size={size} />;
    if (s.includes('simulado')) return <FileText className={className} size={size} />;
    return <Folder className={className} size={size} />;
};

const getRankByHours = (hours: number) => {
    if (hours >= 600) return 'Coronel';
    if (hours >= 500) return 'Tenente-Coronel';
    if (hours >= 450) return 'Major';
    if (hours >= 400) return 'Capitão';
    if (hours >= 350) return '1º Tenente';
    if (hours >= 300) return '2º Tenente';
    if (hours >= 250) return 'Subtenente';
    if (hours >= 200) return '1º Sargento';
    if (hours >= 150) return '2º Sargento';
    if (hours >= 100) return '3º Sargento';
    if (hours >= 50) return 'Cabo';
    if (hours >= 10) return 'Soldado';
    return 'Recruta';
};

const INITIAL_SCHEDULE_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MOTIVATIONAL_QUOTES = ["A persistência é o caminho do êxito.", "Se fosse fácil, qualquer um faria.", "A dor passa, a aprovação fica.", "Treino difícil, combate fácil.", "Desistir não é uma opção.", "Cada hora estudada é um passo fardado.", "Disciplina é liberdade.", "O suor de hoje é a glória de amanhã."];
const ALL_ACHIEVEMENTS_LIST = [{ id: 'h_1', title: 'Recruta', description: '1 Hora de Estudo', icon: '🐣' }, { id: 'h_10', title: 'Soldado', description: '10 Horas de Estudo', icon: '🪖' }, { id: 'h_50', title: 'Cabo', description: '50 Horas de Estudo', icon: '🎗️' }, { id: 'h_100', title: '3º Sargento', description: '100 Horas de Estudo', icon: '🎖️' }, { id: 'h_150', title: '2º Sargento', description: '150 Horas de Estudo', icon: '🎖️' }, { id: 'h_200', title: '1º Sargento', description: '200 Horas de Estudo', icon: '🎖️' }, { id: 'h_250', title: 'Subtenente', description: '250 Horas de Estudo', icon: '🎖️' }, { id: 'h_300', title: '2º Tenente', description: '300 Horas de Estudo', icon: '⭐' }, { id: 'h_350', title: '1º Tenente', description: '350 Horas de Estudo', icon: '⭐' }, { id: 'h_400', title: 'Capitão', description: '400 Horas de Estudo', icon: '⭐⭐' }, { id: 'h_450', title: 'Major', description: '450 Horas de Estudo', icon: '⭐⭐' }, { id: 'h_500', title: 'Tenente-Coronel', description: '500 Horas de Estudo', icon: '⭐⭐⭐' }, { id: 'h_600', title: 'Coronel', description: '600 Horas de Estudo', icon: '👑' }, { id: 'q_100', title: 'Iniciante', description: '100 Questões', icon: '🎯' }, { id: 'q_500', title: 'Praticante', description: '500 Questões', icon: '🎯' }, { id: 'q_1000', title: 'Veterano', description: '1000 Questões', icon: '🎯' }, { id: 'q_1500', title: 'Especialista', description: '1500 Questões', icon: '🎯' }, { id: 'q_2000', title: 'Mestre', description: '2000 Questões', icon: '🎯' }, { id: 'q_3000', title: 'Elite', description: '3000 Questões', icon: '🎯' }, { id: 'q_5000', title: 'Destruidor de Bancas', description: '5000 Questões', icon: '👹' }, { id: 'q_7500', title: 'Lendário', description: '7500 Questões', icon: '🔥' }, { id: 'q_10000', title: 'Deus da Guerra', description: '10000 Questões', icon: '⚡' }];

const ToastContainer = ({ notifications }: { notifications: {id: string, message: string, type: 'success' | 'error' | 'info'}[] }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {notifications.map(notif => (
                <div key={notif.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-lg shadow-xl border-l-4 transform transition-all animate-slide-in text-white flex items-center gap-3 ${notif.type === 'success' ? 'bg-zinc-800 border-green-500' : notif.type === 'error' ? 'bg-zinc-800 border-red-500' : 'bg-zinc-800 border-blue-500'}`}>
                    {notif.type === 'success' ? <CheckCircle size={20} className="text-green-500"/> : notif.type === 'error' ? <XCircle size={20} className="text-red-500"/> : <Bell size={20} className="text-blue-500"/>}
                    <span className="font-medium text-sm">{notif.message}</span>
                </div>
            ))}
        </div>
    );
};

const RichTextEditor = ({ value, onChange }: { value: string, onChange: (html: string) => void }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
             if (document.activeElement !== editorRef.current) editorRef.current.innerHTML = value;
        }
    }, [value]);
    const execCmd = (command: string, arg: string | undefined = undefined) => {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand(command, false, arg);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };
    const addLink = () => { const url = prompt('Insira a URL do link:'); if (url) execCmd('createLink', url); };
    return (
        <div className="border border-zinc-700 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flex-wrap">
                <div className="flex items-center gap-1 border-r border-zinc-300 dark:border-zinc-600 pr-2">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="Negrito"><Bold size={16}/></button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="Itálico"><Italic size={16}/></button>
                </div>
                <div className="flex items-center gap-1 border-r border-zinc-300 dark:border-zinc-600 pr-2">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('fontSize', '5'); }} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="Aumentar"><Type size={16}/></button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('fontSize', '2'); }} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="Diminuir"><Minus size={16}/></button>
                </div>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="Inserir Link"><LinkIcon size={16}/></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="p-1.5 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 rounded" title="Limpar Formatação"><Eraser size={16}/></button>
            </div>
            <div ref={editorRef} className="p-4 min-h-[200px] outline-none prose prose-sm max-w-none dark:prose-invert [&_a]:text-blue-600 [&_a]:underline [&_a]:font-bold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} style={{whiteSpace: 'pre-wrap'}} />
        </div>
    );
};

const AuthScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsLoading(true);

    try {
        if (isLogin) {
            // LOGIN DIRETO NA TABELA USERS (IGNORANDO AUTH DO SUPABASE PARA SIMPLIFICAR)
            const { data: user, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.trim())
                .maybeSingle();

            if (dbError) throw new Error("Erro de conexão com o banco de dados.");
            if (!user) throw new Error("Usuário não encontrado. Verifique o e-mail ou crie uma conta.");

            // Verifica Senha (Comparação direta, conforme solicitado)
            if (user.password !== password) {
                throw new Error("Senha incorreta.");
            }

            // Verificação de Aprovação
            if (user.role === UserRole.STUDENT && !user.approved) {
                throw new Error("Aguardando aprovação do comando.");
            }

            // Sucesso - Login Realizado
            onLogin({ ...user, planId: user.plan_id });

        } else {
            // CADASTRO DIRETO NA TABELA USERS
            if (!name || !email || !password) throw new Error('Preencha todos os campos.');
            
            // Verifica se já existe
            const { data: existing } = await supabase.from('users').select('id').eq('email', email.trim()).maybeSingle();
            if (existing) throw new Error("E-mail já cadastrado.");

            const { error: insertError } = await supabase.from('users').insert({
                email: email.trim(),
                password: password,
                name: name,
                role: 'STUDENT',
                approved: false, // Padrão: Pendente
                study_streak: 0,
                achievements: []
            });

            if (insertError) {
                console.error(insertError);
                throw new Error("Erro ao criar conta no banco de dados.");
            }

            setSuccessMsg('Cadastro realizado! Aguarde a aprovação do administrador para acessar.');
            setIsLogin(true);
            setEmail(''); setPassword(''); setName('');
        }
    } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || 'Erro ao processar solicitação.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4">
      <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-8">
           <img src="https://i.ibb.co/HpqZMgsQ/image.png" alt="Sangue Milico" className="w-32 h-auto mx-auto mb-4" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
           <h1 className="text-2xl font-bold text-zinc-800 dark:text-white">Área do Aluno</h1>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-200">{error}</div>}
        {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm text-center border border-green-200">{successMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-red-600 placeholder-zinc-500" placeholder="Nome Completo" />}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-red-600 placeholder-zinc-500" placeholder="Seu E-mail" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-red-600 placeholder-zinc-500" placeholder="Sua Senha" />
          <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition disabled:opacity-50">
              {isLoading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-zinc-500 hover:text-red-600 underline">{isLogin ? 'Criar conta' : 'Já tenho conta'}</button></div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ user, onLogout, updateProfile, readOnly = false }: { user: User; onLogout: () => void; updateProfile: (u: User) => void; readOnly?: boolean }) => {
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    // Added 'flashcards' to union type
    const [activeTab, setActiveTab] = useState<'painel' | 'estudo' | 'revisoes' | 'simulados' | 'edital' | 'guiado' | 'leiseca' | 'perfil' | 'tutorial' | 'trilha' | 'banco_questoes' | 'redacao' | 'flashcards'>('painel');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [goals, setGoals] = useState<DailyGoal[]>([]);
    const [stats, setStats] = useState<QuestionStats>({ total: 0, correct: 0, incorrect: 0, history: [] });
    // ... (rest of student state logic same as before) ...
    const [revisions, setRevisions] = useState<RevisionItem[]>([]);
    const [simulados, setSimulados] = useState<Simulado[]>([]);
    const [simuladoResults, setSimuladoResults] = useState<SimuladoResult[]>([]);
    const [studySessions, setStudySessions] = useState<StudySession[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [editais, setEditais] = useState<Edital[]>([]);
    const [activeEditalId, setActiveEditalId] = useState<string>('');
    const [editalProgress, setEditalProgress] = useState<EditalProgress[]>([]);
    const [commandMessage, setCommandMessage] = useState('');
    const [tutorialUrl, setTutorialUrl] = useState('');
    const [plans, setPlans] = useState<Plan[]>([]);
    
    // UI Local States
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [newRevSubject, setNewRevSubject] = useState('');
    const [newRevTopic, setNewRevTopic] = useState('');
    const [newRevDate, setNewRevDate] = useState(getLocalISODate());
    const [viewState, setViewState] = useState<'SUBJECTS' | 'TOPICS' | 'CONTENT' | 'CONTENT_LIST'>('SUBJECTS');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
    const [notifications, setNotifications] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSubject, setTimerSubject] = useState<string>('');
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [manualCorrect, setManualCorrect] = useState(0);
    const [manualWrong, setManualWrong] = useState(0);
    const [newGoalText, setNewGoalText] = useState('');
    const [activeSimulado, setActiveSimulado] = useState<Simulado | null>(null);
    const [simuladoAnswers, setSimuladoAnswers] = useState<Record<number, string>>({});
    const [reviewMode, setReviewMode] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [statsPeriod, setStatsPeriod] = useState<'DAY' | 'MONTH' | 'YEAR' | 'ALL'>('ALL');
    const [objective, setObjective] = useState(user.objective || '');
    
    // ONLINE Simulado State
    const [currentOnlineQIndex, setCurrentOnlineQIndex] = useState(0);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString(); setNotifications(prev => [...prev, { id, message, type }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    };

    // Helper to check if item is visible to user
    const isVisibleToUser = (allowedPlans: string[] | undefined) => {
        // If no specific plans defined, it's Global (visible to everyone)
        if (!allowedPlans || allowedPlans.length === 0) return true;
        // If user has a plan and it matches
        if (user.planId && allowedPlans.includes(user.planId)) return true;
        return false;
    };

    // Load Data from Supabase and Apply Filtering
    useEffect(() => {
        const loadStudentData = async () => {
            const userId = user.id;
            
            // Global Content - FETCH ALL then FILTER
            const allMaterials = await globalRepo.getMaterials();
            const allSimulados = await globalRepo.getSimulados();
            const allEditais = await globalRepo.getEditais();
            const allPlans = await globalRepo.getPlans(); // Load Plans for checking permissions
            const msg = await globalRepo.getCommandMessage();
            const vid = await globalRepo.getTutorialVideo();
            
            // Filter logic
            setMaterials(allMaterials.filter(m => isVisibleToUser(m.allowedPlanIds)));
            const visibleSimulados = allSimulados.filter(s => isVisibleToUser(s.allowedPlanIds));
            setSimulados(visibleSimulados);
            const visibleEditais = allEditais.filter(e => isVisibleToUser(e.allowedPlanIds));
            setEditais(visibleEditais);
            
            setPlans(allPlans);
            setCommandMessage(msg); 
            setTutorialUrl(vid);
            
            if (visibleEditais.length > 0) setActiveEditalId(visibleEditais[0].id);

            // User Specific
            const loadedSubjects = await userProgressRepo.get(userId, 'subjects', getStorage('subjects', [])); 
            const loadedSchedule = await userProgressRepo.get(userId, 'schedule', getStorage('schedule', []));
            const loadedGoals = await userProgressRepo.get(userId, 'daily_goals', []);
            const loadedStats = await userProgressRepo.get(userId, 'stats', { total: 0, correct: 0, incorrect: 0, history: [] });
            const loadedRevisions = await userProgressRepo.get(userId, 'revisions', []);
            const loadedResults = await userProgressRepo.get(userId, 'simulado_results', []);
            const loadedSessions = await userProgressRepo.get(userId, 'study_sessions', []);
            const loadedEditalProg = await userProgressRepo.get(userId, 'edital_progress', []);

            setSubjects(loadedSubjects);
            if (!loadedSchedule || loadedSchedule.length === 0) {
                const defaultSchedule = INITIAL_SCHEDULE_DAYS.map(day => ({ day, subjects: [] }));
                setSchedule(defaultSchedule);
            } else {
                setSchedule(loadedSchedule);
            }
            setGoals(loadedGoals); setStats(loadedStats); setRevisions(loadedRevisions); setSimuladoResults(loadedResults); setStudySessions(loadedSessions); setEditalProgress(loadedEditalProg);
        };
        loadStudentData();
    }, [user.id, user.planId]); // Re-run if user or plan changes

    // Check if user has premium plan
    const premiumPlan = plans.find(p => p.name.trim().toUpperCase() === 'MENTORIA PREMIUM');
    const hasPremium = !!(user.planId && premiumPlan && user.planId === premiumPlan.id);

    // Timer Interval
    useEffect(() => {
        let interval: any;
        if (isTimerRunning && !readOnly) {
          interval = setInterval(() => { setTimerSeconds(s => s + 1); }, 1000);
        } 
        return () => clearInterval(interval);
    }, [isTimerRunning, readOnly]);

    // Override generic setters to sync with Supabase
    const sync = async (key: string, value: any) => {
        await userProgressRepo.set(user.id, key, value);
    };
    
    // ... [KEEP ALL STUDENT LOGIC UNCHANGED] ...
    const checkAchievements = (newStats: QuestionStats, newTotalHours?: number) => {
        if (readOnly) return;
        const totalQ = newStats.total;
        let totalH = 0;
        if (newTotalHours !== undefined) {
            totalH = newTotalHours;
        } else {
            totalH = subjects.reduce((acc, s) => acc + s.totalHoursStudied, 0);
        }
        const newAchievements = [...user.achievements];
        let unlockedCount = 0;
        ALL_ACHIEVEMENTS_LIST.forEach(ach => {
            const isUnlocked = newAchievements.some(ua => ua.id === ach.id);
            if (isUnlocked) return;
            let achieved = false;
            if (ach.id.startsWith('q_')) {
                const target = parseInt(ach.id.split('_')[1]);
                if (totalQ >= target) achieved = true;
            } else if (ach.id.startsWith('h_')) {
                const target = parseInt(ach.id.split('_')[1]);
                if (totalH >= target) achieved = true;
            }
            if (achieved) {
                newAchievements.push({ ...ach, unlocked: true });
                showNotification(`Conquista Desbloqueada: ${ach.title}`, 'success');
                unlockedCount++;
            }
        });
        if (unlockedCount > 0) {
            const updatedUser = { ...user, achievements: newAchievements };
            updateProfile(updatedUser);
        }
    };
    const addGoal = () => {
        if (!newGoalText) return;
        const goal: DailyGoal = { id: Date.now().toString(), text: newGoalText, completed: false, dateCreated: getLocalISODate() };
        const updated = [...goals, goal]; setGoals(updated); sync('daily_goals', updated); setNewGoalText('');
    };
    const toggleGoal = (id: string) => { const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g); setGoals(updated); sync('daily_goals', updated); };
    const removeGoal = (id: string) => { const updated = goals.filter(g => g.id !== id); setGoals(updated); sync('daily_goals', updated); };
    const handleFinishStudy = () => {
        if (timerSeconds > 0 && timerSubject) {
            if (readOnly) { setTimerSeconds(0); setIsTimerRunning(false); return; }
            const newSession = { id: Date.now().toString(), subjectId: timerSubject, durationSeconds: timerSeconds, date: new Date().toISOString() };
            const updatedSessions = [...studySessions, newSession]; setStudySessions(updatedSessions); sync('study_sessions', updatedSessions);
            const updatedSubjects = subjects.map(s => s.id === timerSubject ? { ...s, totalHoursStudied: s.totalHoursStudied + (timerSeconds / 3600) } : s);
            setSubjects(updatedSubjects); sync('subjects', updatedSubjects);
            const today = getLocalISODate();
            let newStreak = user.studyStreak || 0;
            if (user.lastStudyDate !== today) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                if (user.lastStudyDate === yesterday.toISOString().split('T')[0]) newStreak++; else newStreak = 1;
                const updatedUser = { ...user, lastStudyDate: today, studyStreak: newStreak };
                updateProfile(updatedUser); 
            }
            const totalHours = updatedSubjects.reduce((acc, s) => acc + s.totalHoursStudied, 0);
            checkAchievements(stats, totalHours);
            setTimerSeconds(0); setIsTimerRunning(false); setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)); showNotification("Estudo registrado!", "success");
        }
    };
    const updateStats = (correct: number, incorrect: number) => {
        if (readOnly) return;
        const today = getLocalISODate();
        const newHistory = [...(stats.history || [])];
        const todayIdx = newHistory.findIndex(h => h.date === today);
        if (todayIdx >= 0) newHistory[todayIdx].count += (correct + incorrect);
        else newHistory.push({ date: today, count: correct + incorrect });
        const newStats = { total: stats.total + correct + incorrect, correct: stats.correct + correct, incorrect: stats.incorrect + incorrect, history: newHistory };
        setStats(newStats); sync('stats', newStats);
        checkAchievements(newStats);
    };
    const finishSimulado = () => {
        if(!activeSimulado || reviewMode) return;
        let correct = 0; 
        let wrong = 0; 
        let answersStringParts = [];
        const isOnlineMode = activeSimulado.mode === 'ONLINE';

        for(let i=0; i<activeSimulado.questionCount; i++) {
            const qNum = i + 1; 
            const userAns = simuladoAnswers[qNum] || 'X';
            let expected = '';
            
            if (isOnlineMode && activeSimulado.questions) {
                 expected = activeSimulado.questions[i].correctAnswer;
            } else {
                 const keyMap = activeSimulado.answerKey.split(',').map(k => k.trim().toUpperCase());
                 const keyItem = keyMap.find(k => k.replace(/[^0-9]/g, '') === qNum.toString()) || keyMap[i];
                 expected = keyItem ? keyItem.replace(/[0-9]/g, '').trim() : '';
            }

            if (userAns === expected) correct++; else wrong++; 
            answersStringParts.push(`${qNum}${userAns}`);
        }
        const score = (correct / activeSimulado.questionCount) * 10;
        if (!readOnly) {
            const res = { simuladoId: activeSimulado.id, dateTaken: new Date().toISOString(), correctAnswers: correct, wrongAnswers: wrong, score: score, studentAnswers: answersStringParts.join(',') };
            const newRes = [...simuladoResults, res]; setSimuladoResults(newRes); sync('simulado_results', newRes);
            if(!simuladoResults.find(r => r.simuladoId === activeSimulado.id) && !isPracticeMode) { updateStats(correct, wrong); }
        }
        setActiveSimulado(null);
    };
    const toggleEditalTopic = (topicId: string) => {
        if (readOnly) return;
        let newProgress = [...editalProgress];
        const exists = newProgress.find(p => p.topicId === topicId);
        if(exists) newProgress = newProgress.filter(p => p.topicId !== topicId); else newProgress.push({ topicId, completed: true });
        setEditalProgress(newProgress); sync('edital_progress', newProgress);
    };
    const handleCreateRevision = () => {
        if (readOnly) return;
        if(!newRevSubject || !newRevTopic || !newRevDate) return;
        const intervals = [1, 7, 14, 28]; const groupId = Date.now().toString();
        const newRevs = intervals.map(days => {
            const d = new Date(newRevDate + 'T12:00:00'); d.setDate(d.getDate() + days);
            return { id: Math.random().toString(36).substr(2, 9), groupId, subject: newRevSubject, topic: newRevTopic, dateStudied: newRevDate, scheduledDate: d.toISOString().split('T')[0], stage: days as any, completed: false };
        });
        const updated = [...revisions, ...newRevs]; setRevisions(updated); sync('revisions', updated);
        setNewRevSubject(''); setNewRevTopic(''); setNewRevDate(getLocalISODate());
    };
    const completeRevision = (id: string) => {
        if (readOnly) return;
        const updated = revisions.map(r => r.id === id ? { ...r, completed: true } : r); setRevisions(updated); sync('revisions', updated);
    };
    const deleteRevisionGroup = (groupId: string | undefined, id: string) => {
        if (readOnly) return;
        if(!window.confirm('Excluir?')) return;
        const safeRevisions = revisions || [];
        const updated = groupId ? safeRevisions.filter(r => r.groupId !== groupId) : safeRevisions.filter(r => r.id !== id);
        setRevisions(updated); sync('revisions', updated);
    };
    const saveObjective = () => { if (readOnly) return; const updated = { ...user, objective }; updateProfile(updated); };
    const addSubjectToSchedule = (dIdx: number, sName: string) => { if (readOnly) return; const day = INITIAL_SCHEDULE_DAYS[dIdx]; const newSch = schedule.map(d => d.day === day ? { ...d, subjects: [...d.subjects, sName] } : d); setSchedule(newSch); sync('schedule', newSch); };
    const removeSubjectFromSchedule = (dIdx: number, sIdx: number) => { if (readOnly) return; const day = INITIAL_SCHEDULE_DAYS[dIdx]; const newSch = schedule.map(d => { if (d.day === day) { const ns = [...d.subjects]; ns.splice(sIdx, 1); return { ...d, subjects: ns }; } return d; }); setSchedule(newSch); sync('schedule', newSch); };
    const filterByPeriod = (dateStr: string) => { if (!dateStr) return false; const d = new Date(dateStr); const now = new Date(); if (statsPeriod === 'ALL') return true; if (statsPeriod === 'DAY') return d.toDateString() === now.toDateString(); if (statsPeriod === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); if (statsPeriod === 'YEAR') return d.getFullYear() === now.getFullYear(); return true; };
    const startSimulado = (sim: Simulado, review: boolean = false, answersStr: string = '') => { setActiveSimulado(sim); setReviewMode(review); if (answersStr) { const map: Record<number, string> = {}; answersStr.split(',').forEach(p => { const m = p.match(/(\d+)([A-Z])/); if (m) map[parseInt(m[1])] = m[2]; }); setSimuladoAnswers(map); } else { setSimuladoAnswers({}); } setIsPracticeMode(false); setCurrentOnlineQIndex(0); };
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (readOnly) return; if (e.target.files && e.target.files[0]) { try { const base64 = await compressImage(e.target.files[0]); const updatedUser = { ...user, avatar: base64 }; updateProfile(updatedUser); showNotification("Avatar atualizado!", "success"); } catch (err) { console.error(err); showNotification("Erro ao processar imagem", "error"); } } };
    const calculateEditalProgress = () => { const active = editais.find(e => e.id === activeEditalId); if (!active) return 0; let total = 0; active.subjects.forEach(s => total += s.topics.length); if (total === 0) return 0; const activeTopicIds = active.subjects.flatMap(s => s.topics.map(t => t.id)); const completedCount = editalProgress.filter(p => activeTopicIds.includes(p.topicId)).length; return Math.round((completedCount / total) * 100); };
    const safeRevisions = Array.isArray(revisions) ? revisions : [];
    const todaysRevisions = safeRevisions.filter(r => r.scheduledDate === getLocalISODate() && !r.completed);
    const futureRevisions = safeRevisions.filter(r => r.scheduledDate > getLocalISODate() && !r.completed).sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    const filteredSessions = studySessions.filter(s => filterByPeriod(s.date));
    const filteredHistory = (stats.history || []).filter(h => filterByPeriod(h.date));
    const filteredMaterials = materials.filter(m => { const matchSubject = m.subject === selectedSubject; const matchCategory = m.category === (activeTab === 'guiado' ? 'GUIDED' : 'LEI_SECA'); if (activeTab === 'leiseca' && viewState === 'CONTENT_LIST') return matchSubject && matchCategory; const matchTopic = selectedTopic ? m.topic === selectedTopic : true; return matchSubject && matchCategory && matchTopic; }).sort((a, b) => (a.order || 0) - (b.order || 0));
    const studyDistributionData = subjects.map(subj => { const totalSeconds = filteredSessions.filter(session => session.subjectId === subj.id).reduce((acc, session) => acc + session.durationSeconds, 0); return { name: subj.name, hours: totalSeconds / 3600 }; }).sort((a, b) => b.hours - a.hours);
    const recentSessions = studySessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const recentSimulados = simuladoResults.sort((a,b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()).slice(0, 5);

    if (activeSimulado) {
        return (
            <div className="min-h-screen bg-zinc-100 dark:bg-[#09090b] p-4 md:p-8 text-zinc-800 dark:text-white">
                <header className="flex justify-between items-center mb-8 border-b border-zinc-300 dark:border-zinc-800 pb-4 sticky top-0 bg-zinc-100 dark:bg-[#09090b] z-10"><h1 className="text-xl md:text-2xl font-bold text-red-600">{activeSimulado.title} {reviewMode ? '(GABARITO)' : ''}</h1><button onClick={() => { setActiveSimulado(null); setReviewMode(false); }} className="text-zinc-500 hover:text-red-500">Sair</button></header>
                
                {/* PDF MODE */}
                {(activeSimulado.mode === 'PDF' || !activeSimulado.mode) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-150px)]"><div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-lg relative"><iframe src={activeSimulado.pdfUrl} className="w-full h-full" title="Simulado PDF"></iframe></div><div className="overflow-y-auto bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg"><div className="space-y-4">{Array.from({length: activeSimulado.questionCount}).map((_, i) => { const qNum = i + 1; const userAns = simuladoAnswers[qNum]; const keyMap = activeSimulado.answerKey.split(',').map(k => k.trim().toUpperCase()); const keyItem = keyMap.find(k => k.replace(/[^0-9]/g, '') === qNum.toString()) || keyMap[i]; const correctAns = keyItem ? keyItem.replace(/[0-9]/g, '').trim() : ''; return (<div key={i+1} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded"><span className="font-bold w-8 text-sm">{i+1}</span>{['A','B','C','D','E'].slice(0, activeSimulado.type === 'ABCD' ? 4 : (activeSimulado.type === 'CERTO_ERRADO' ? 2 : 5)).map(opt => { const label = activeSimulado.type === 'CERTO_ERRADO' ? (opt === 'A' ? 'C' : 'E') : opt; const isSelected = simuladoAnswers[qNum] === label; const isCorrect = reviewMode && correctAns === label; let btnClass = "border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700"; if (isSelected && !reviewMode) btnClass = "bg-red-600 text-white border-red-600"; if (reviewMode) { if (isCorrect) btnClass = "bg-green-600 text-white border-green-600"; else if (isSelected && !isCorrect) btnClass = "bg-red-600 text-white border-red-600 opacity-50"; else btnClass = "border-zinc-700 opacity-30"; } return (<button key={opt} disabled={reviewMode} onClick={() => !reviewMode && setSimuladoAnswers(p => ({...p, [qNum]: label}))} className={`w-8 h-8 rounded-full border text-xs font-bold transition-all ${btnClass}`}>{label}</button>); })}</div>); })}</div>{!reviewMode && <button onClick={finishSimulado} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl mt-8 shadow-lg shadow-green-900/20 hover:bg-green-700 transition">ENVIAR GABARITO</button>}</div></div>
                )}

                {/* ONLINE MODE */}
                {activeSimulado.mode === 'ONLINE' && activeSimulado.questions && (
                    <div className="max-w-4xl mx-auto h-[calc(100vh-150px)] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Questão {currentOnlineQIndex + 1} de {activeSimulado.questionCount}</span>
                            <div className="flex gap-2">
                                <button disabled={currentOnlineQIndex === 0} onClick={() => setCurrentOnlineQIndex(prev => prev - 1)} className="bg-zinc-800 text-white px-4 py-2 rounded font-bold disabled:opacity-50">Anterior</button>
                                <button disabled={currentOnlineQIndex === activeSimulado.questions.length - 1} onClick={() => setCurrentOnlineQIndex(prev => prev + 1)} className="bg-zinc-800 text-white px-4 py-2 rounded font-bold disabled:opacity-50">Próxima</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                             {/* Render Current Question */}
                             {(() => {
                                 const q = activeSimulado.questions[currentOnlineQIndex];
                                 const qNum = currentOnlineQIndex + 1;
                                 const currentAns = simuladoAnswers[qNum];
                                 const correctAns = q.correctAnswer;
                                 
                                 return (
                                     <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-6">
                                         <p className="text-lg leading-relaxed mb-8">{q.text}</p>
                                         <div className="space-y-3">
                                             {q.alternatives.map(alt => {
                                                 let btnClass = "border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500";
                                                 if (currentAns === alt.label && !reviewMode) btnClass = "bg-red-900/40 border-red-500 text-red-100";
                                                 if (reviewMode) {
                                                     if (alt.label === correctAns) btnClass = "bg-green-900/40 border-green-500 text-green-100";
                                                     else if (currentAns === alt.label) btnClass = "bg-red-900/40 border-red-500 text-red-100 opacity-50";
                                                     else btnClass = "border-zinc-800 opacity-30 grayscale";
                                                 }

                                                 return (
                                                     <button 
                                                        key={alt.label}
                                                        disabled={reviewMode}
                                                        onClick={() => setSimuladoAnswers(p => ({...p, [qNum]: alt.label}))}
                                                        className={`w-full text-left p-4 rounded-lg border flex items-start gap-4 transition-all ${btnClass}`}
                                                     >
                                                         <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${currentAns === alt.label ? 'border-transparent bg-white text-black' : 'border-zinc-600 text-zinc-500'}`}>{alt.label}</div>
                                                         <span className="flex-1">{alt.text}</span>
                                                     </button>
                                                 )
                                             })}
                                         </div>
                                     </div>
                                 )
                             })()}
                        </div>
                        
                        {!reviewMode && (
                             <div className="mt-4 border-t border-zinc-800 pt-4 flex justify-end">
                                 {Object.keys(simuladoAnswers).length === activeSimulado.questionCount ? (
                                     <button onClick={finishSimulado} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition">FINALIZAR SIMULADO</button>
                                 ) : (
                                     <span className="text-zinc-500 italic text-sm">Responda todas as questões para finalizar. ({Object.keys(simuladoAnswers).length}/{activeSimulado.questionCount})</span>
                                 )}
                             </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 transition-colors duration-300">
            <ToastContainer notifications={notifications} />
            {!readOnly && <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden fixed bottom-6 right-6 z-50 bg-zinc-900 text-white p-4 rounded-full shadow-2xl hover:bg-zinc-800 transition-transform transform hover:scale-110"><Menu size={24} /></button>}
            {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>}
            
            {/* SIDEBAR RECOLHÍVEL DO ALUNO */}
            {!readOnly && (
                <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex flex-col fixed h-full z-40 shadow-lg transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <div className={`flex items-center gap-2 font-bold text-xl dark:text-white ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                            <img src="https://i.ibb.co/HpqZMgsQ/image.png" className={`h-auto transition-all ${isSidebarCollapsed ? 'w-10' : 'w-16'}`} alt="Logo" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}/>
                            {!isSidebarCollapsed && <span>SANGUE MILICO</span>}
                        </div>
                        {!isSidebarCollapsed && <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block text-zinc-500 hover:text-white"><ChevronLeft size={20}/></button>}
                    </div>
                    {isSidebarCollapsed && (
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex w-full justify-center py-2 text-zinc-500 hover:text-white hover:bg-zinc-800"><ChevronRight size={20}/></button>
                    )}
                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                        {[
                            { id: 'painel', label: 'Painel Geral', icon: <LayoutDashboard size={18}/> }, 
                            { id: 'estudo', label: 'Sala de Estudos', icon: <Clock size={18}/> }, 
                            { id: 'flashcards', label: 'Flashcards', icon: <Layers size={18}/> }, // NEW
                            { id: 'guiado', label: 'Estudo Guiado', icon: <BookOpen size={18}/> }, 
                            { id: 'leiseca', label: 'Lei Seca', icon: <Scale size={18}/> }, 
                            { id: 'revisoes', label: 'Revisões', icon: <Calendar size={18}/> }, 
                            { id: 'simulados', label: 'Simulados', icon: <FileText size={18}/> }, 
                            { id: 'edital', label: 'Edital Vertical', icon: <CheckSquare size={18}/> }, 
                            { id: 'tutorial', label: 'Manual do Recruta', icon: <HelpCircle size={18}/> }, 
                            { id: 'perfil', label: 'Meu Perfil', icon: <UserIcon size={18}/> }, 
                            { id: 'trilha', label: 'Trilha / Mentoria', icon: <Map size={18}/> }, 
                            { id: 'banco_questoes', label: 'Banco de Questões', icon: <Database size={18}/> }, 
                            { id: 'redacao', label: 'Redação Mentoria', icon: <PenTool size={18}/> }
                        ].map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => { setActiveTab(item.id as any); setMobileMenuOpen(false); setViewState('SUBJECTS'); setSelectedSubject(null); setSelectedTopic(null); }} 
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm font-medium ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                title={isSidebarCollapsed ? item.label : ''}
                            >
                                {item.icon} 
                                {!isSidebarCollapsed && <span>{item.label}</span>}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800"><button onClick={onLogout} className={`flex items-center gap-2 text-zinc-500 hover:text-red-500 w-full px-2 py-2 rounded transition ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Sair"><LogOut size={16} /> {!isSidebarCollapsed && 'Sair'}</button></div>
                </aside>
            )}

            <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ${!readOnly ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : 'w-full'}`}>
                {/* Content rendering using state */}
                {activeTab === 'painel' && <div className="space-y-6 animate-fade-in"><header><h2 className="text-3xl font-bold dark:text-white mb-1">Bem-vindo, {user.name}</h2><p className="text-zinc-500 dark:text-zinc-400 italic">"Missão dada é missão cumprida!"</p></header>
                {commandMessage && <div className="bg-[#1f1212] border-l-4 border-red-600 p-6 rounded-r-xl shadow-lg relative overflow-hidden"><div className="flex items-center gap-3 mb-3 text-red-500 font-bold uppercase tracking-widest text-sm"><Megaphone size={18} /><span>Aviso do Comando</span></div><div className="prose prose-invert prose-sm max-w-none text-zinc-300" dangerouslySetInnerHTML={{__html: commandMessage}} /></div>}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-red-600 transition flex flex-col justify-between h-24"><div className="flex justify-between items-start"><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Horas Estudadas</p><Clock className="text-red-600" size={18}/></div><h3 className="text-2xl font-bold text-white">{(filteredSessions.reduce((acc: number,s) => acc+s.durationSeconds,0)/3600).toFixed(1)}h</h3></div><div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-red-600 transition flex flex-col justify-between h-24"><div className="flex justify-between items-start"><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Questões Feitas</p><Target className="text-white" size={18}/></div><h3 className="text-2xl font-bold text-white">{filteredHistory.reduce((acc: number,h) => acc+h.count, 0)}</h3></div><div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-red-600 transition flex flex-col justify-between h-24"><div className="flex justify-between items-start"><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Simulados</p><FileText className="text-blue-500" size={18}/></div><h3 className="text-2xl font-bold text-white">{simuladoResults.filter(s => filterByPeriod(s.dateTaken)).length}</h3></div><div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-red-600 transition flex flex-col justify-between h-24"><div className="flex justify-between items-start"><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Aproveitamento</p><BarChart2 className="text-green-500" size={18}/></div><h3 className="text-2xl font-bold text-white">{stats.total>0?Math.round((stats.correct/stats.total)*100):0}%</h3></div></div><div className="bg-[#18181b] border border-zinc-800 p-6 rounded-xl"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Distribuição de Tempo por Matéria</h3><div className="w-full h-[600px]"><StudyHoursChart data={studyDistributionData} /></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-[#18181b] border border-zinc-800 p-6 rounded-xl flex flex-col"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-500"/> Histórico de Missões (Estudo)</h3><div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-2">{recentSessions.map(session => (<div key={session.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded border border-zinc-800"><div className="flex items-center gap-3"><div className="p-2 bg-green-900/20 rounded-full text-green-500"><CheckCircle size={16}/></div><div><p className="text-sm font-bold text-white">{subjects.find(s => s.id === session.subjectId)?.name || 'Estudo Livre'}</p><p className="text-xs text-zinc-500">{new Date(session.date).toLocaleDateString('pt-BR')}</p></div></div><span className="text-sm font-mono text-green-400 font-bold">{formatTime(session.durationSeconds)}</span></div>))} {recentSessions.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">Nenhum registro recente.</p>}</div></div><div className="bg-[#18181b] border border-zinc-800 p-6 rounded-xl flex flex-col"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy size={18} className="text-yellow-500"/> Relatório de Combate (Simulados)</h3><div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-2">{recentSimulados.map(result => { const simTitle = simulados.find(s => s.id === result.simuladoId)?.title || 'Simulado'; const isApproved = result.score >= 7; return (<div key={result.simuladoId + result.dateTaken} className="flex justify-between items-center p-3 bg-zinc-900 rounded border border-zinc-800"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${isApproved ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}><Target size={16}/></div><div><p className="text-sm font-bold text-white truncate max-w-[150px]">{simTitle}</p><p className="text-xs text-zinc-500">{new Date(result.dateTaken).toLocaleDateString('pt-BR')}</p></div></div><div className="text-right"><p className={`text-sm font-bold ${isApproved ? 'text-green-500' : 'text-red-500'}`}>{result.score.toFixed(1)}/10</p><span className="text-[10px] uppercase font-bold tracking-wide text-zinc-600">{isApproved ? 'APROVADO' : 'QAP'}</span></div></div>); })} {recentSimulados.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">Nenhum simulado realizado.</p>}</div></div></div></div>}
                
                {/* [COLLAPSED SECTIONS FOR BREVITY - RENDERED AS IN PREVIOUS STEPS] */}
                {/* ... (estudo, revisoes, simulados, edital, guiado, leiseca, perfil, tutorial) ... */}
                {activeTab === 'estudo' && <div className="space-y-6 animate-fade-in pb-20"><div className="bg-[#18181b] rounded-xl border border-zinc-800 p-6"><div className="flex items-center gap-2 mb-4 text-red-500 font-bold text-lg"><CheckSquare /> <h3>Meta do Dia</h3></div><div className="space-y-2 mb-4">{goals.map(g => (<div key={g.id} className="flex items-center gap-3 group"><button onClick={() => toggleGoal(g.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition ${g.completed ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-600 hover:border-red-500'}`}>{g.completed && <CheckCircle size={14}/>}</button><span className={`flex-1 text-sm ${g.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{g.text}</span><button onClick={() => removeGoal(g.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></div>))}{goals.length === 0 && <p className="text-zinc-600 italic text-sm">Nenhuma meta definida para hoje.</p>}</div><div className="flex gap-2"><input type="text" value={newGoalText} onChange={e => setNewGoalText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="Nova meta..." className="flex-1 bg-[#09090b] border border-zinc-700 rounded p-2 text-white outline-none focus:border-red-600"/><button onClick={addGoal} className="bg-red-600 text-white px-4 rounded hover:bg-red-700"><Plus/></button></div></div><div className="bg-zinc-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black rounded-xl border-t-4 border-red-600 p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-zinc-800"><div className="absolute inset-0 opacity-10 bg-[length:30px_30px] bg-[position:0_0,15px_15px]"></div><div className="relative z-10 w-full flex flex-col items-center"><h3 className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase mb-4">Cronômetro Tático</h3><div className="text-7xl md:text-8xl font-mono font-bold text-white tracking-widest mb-6 drop-shadow-md">{formatTime(timerSeconds)}</div><p className="text-yellow-500 italic text-sm md:text-base mb-8 text-center max-w-2xl">"{MOTIVATIONAL_QUOTES[quoteIndex]}"</p>{!isTimerRunning && !timerSeconds ? (<div className="w-full max-w-md mb-6"><select value={timerSubject} onChange={e => setTimerSubject(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700 text-white p-3 rounded-lg outline-none focus:border-red-600 backdrop-blur-sm"><option value="">Selecione a matéria para iniciar...</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>) : (<div className="mb-6 px-4 py-1 rounded bg-zinc-900/80 text-zinc-400 text-xs font-bold uppercase tracking-wider border border-zinc-800 backdrop-blur-sm">{subjects.find(s => s.id === timerSubject)?.name || 'Estudo Livre'}</div>)}<div className="flex gap-4 w-full max-w-lg">{!isTimerRunning ? (<button onClick={() => { if(!timerSubject) return showNotification("Selecione uma matéria!", "error"); setIsTimerRunning(true); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg hover:shadow-green-900/50"><Play size={20}/> INICIAR</button>) : (<button onClick={() => setIsTimerRunning(false)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"><Pause size={20}/> PAUSAR</button>)}<button onClick={handleFinishStudy} disabled={timerSeconds === 0} className={`flex-1 font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg ${timerSeconds > 0 ? 'bg-red-900/80 hover:bg-red-800 text-white border border-red-700 hover:shadow-red-900/50' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}><StopCircle size={20}/> TERMINAR</button></div></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-[#18181b] rounded-xl border border-zinc-800 p-6 flex flex-col"><h3 className="text-xl font-bold text-white mb-6">Cronograma Semanal</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">{schedule.map((dayItem, dIdx) => (<div key={dayItem.day} className="bg-[#09090b] p-4 rounded-lg border border-zinc-800"><h4 className="font-bold text-red-500 mb-3">{dayItem.day}</h4><div className="space-y-2 mb-3">{dayItem.subjects.map((subj, sIdx) => (<div key={sIdx} className="flex justify-between items-center bg-zinc-800 px-3 py-2 rounded text-sm text-zinc-200 group"><span>{subj}</span><button onClick={() => removeSubjectFromSchedule(dIdx, sIdx)} className="text-zinc-500 hover:text-red-500 opacity-60 group-hover:opacity-100"><XCircle size={14}/></button></div>))}{dayItem.subjects.length === 0 && <span className="text-xs text-zinc-600 italic">Descanso / Livre</span>}</div><select onChange={(e) => { if(e.target.value) { addSubjectToSchedule(dIdx, e.target.value); e.target.value = ""; } }} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs rounded p-2 outline-none focus:border-red-600"><option value="">+ Adicionar Matéria</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>))}</div></div><div className="bg-[#18181b] rounded-xl border border-zinc-800 p-6 flex flex-col"><h3 className="text-xl font-bold text-white mb-4">Contador de Questões</h3><div className="flex-1 flex flex-col items-center justify-center"><div className="w-full relative mb-4 p-2 bg-[#09090b] rounded-lg border border-zinc-800/50"><h4 className="text-xs font-bold text-center text-zinc-400 mb-2 uppercase tracking-wide">Desempenho Geral</h4><QuestionPieChart correct={stats.correct} incorrect={stats.incorrect} /></div><div className="w-full grid grid-cols-2 gap-4 mb-4"><div className="bg-[#09090b] p-3 rounded-lg border border-green-900/30 flex flex-col items-center"><span className="text-green-500 font-bold mb-2 text-sm">Acertos (+{manualCorrect})</span><div className="flex items-center gap-3"><button onClick={() => setManualCorrect(Math.max(0, manualCorrect - 1))} className="w-8 h-8 rounded bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700">-</button><span className="text-xl font-bold text-white w-8 text-center">{manualCorrect}</span><button onClick={() => setManualCorrect(manualCorrect + 1)} className="w-8 h-8 rounded bg-green-600 text-white flex items-center justify-center hover:bg-green-700">+</button></div></div><div className="bg-[#09090b] p-3 rounded-lg border border-red-900/30 flex flex-col items-center"><span className="text-red-500 font-bold mb-2 text-sm">Erros (+{manualWrong})</span><div className="flex items-center gap-3"><button onClick={() => setManualWrong(Math.max(0, manualWrong - 1))} className="w-8 h-8 rounded bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700">-</button><span className="text-xl font-bold text-white w-8 text-center">{manualWrong}</span><button onClick={() => setManualWrong(manualWrong + 1)} className="w-8 h-8 rounded bg-red-600 text-white flex items-center justify-center hover:bg-red-700">+</button></div></div></div><button onClick={() => { updateStats(manualCorrect, manualWrong); setManualCorrect(0); setManualWrong(0); showNotification("Questões registradas!", "success"); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold py-3 rounded-lg transition">Atualizar Contador</button></div></div></div></div>}
                {activeTab === 'revisoes' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 shadow-lg">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus className="text-red-600"/> Registrar Novo Estudo</h3>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full space-y-1">
                                    <label className="text-xs text-zinc-400 font-bold uppercase ml-1">Matéria</label>
                                    <select value={newRevSubject} onChange={e => setNewRevSubject(e.target.value)} className="w-full bg-[#09090b] border border-zinc-700 text-zinc-300 rounded-lg p-3 outline-none focus:border-red-600 transition-colors">
                                        <option value="">Selecione...</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex-[2] w-full space-y-1">
                                    <label className="text-xs text-zinc-400 font-bold uppercase ml-1">Assunto</label>
                                    <input type="text" value={newRevTopic} onChange={e => setNewRevTopic(e.target.value)} placeholder="Ex: Crase..." className="w-full bg-[#09090b] border border-zinc-700 text-zinc-300 rounded-lg p-3 outline-none focus:border-red-600 transition-colors"/>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto items-end">
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-bold uppercase ml-1">Data</label>
                                        <input type="date" value={newRevDate} onChange={e => setNewRevDate(e.target.value)} className="bg-[#09090b] border border-zinc-700 text-zinc-300 rounded-lg p-3 outline-none focus:border-red-600 transition-colors"/>
                                    </div>
                                    <button onClick={handleCreateRevision} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition shadow-lg shadow-red-900/20 h-[50px]">Gerar Ciclo</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                            <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex flex-col shadow-lg">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2"><h3 className="text-white font-bold text-lg">Revisões de Hoje</h3></div>
                                    <span className="bg-red-900/30 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-900/50">{todaysRevisions.length} Pendentes</span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                    {todaysRevisions.map(rev => (
                                        <div key={rev.id} className="relative bg-[#09090b] p-4 rounded-lg border-l-4 border-red-600 border-t border-r border-b border-zinc-800 flex justify-between items-center group">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-bold text-base">{rev.subject}</span>
                                                    <span className="text-[10px] bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-900">{rev.stage} dias</span>
                                                </div>
                                                <p className="text-sm text-zinc-400">{rev.topic}</p>
                                            </div>
                                            <div className="flex items-center gap-2 relative z-50">
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteRevisionGroup(rev.groupId, rev.id); }} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition cursor-pointer"><Trash2 size={20}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); completeRevision(rev.id); }} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-900/20 transition transform active:scale-95"><Check size={20}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex flex-col shadow-lg">
                                <div className="flex items-center gap-2 mb-6"><Calendar className="text-zinc-400" size={20}/><h3 className="text-white font-bold text-lg">Cronograma Futuro</h3></div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                                    {futureRevisions.map((rev, idx) => (
                                        <div key={rev.id} className="relative p-4 rounded-lg hover:bg-[#09090b] border border-transparent hover:border-zinc-800 transition flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1 h-10 bg-zinc-800 rounded-full group-hover:bg-red-600 transition-colors"></div>
                                                <div>
                                                    <p className="text-zinc-200 font-bold text-sm">{rev.subject}</p>
                                                    <p className="text-xs text-zinc-500">{rev.topic}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 relative z-50">
                                                <div className="text-right">
                                                    <p className="text-zinc-300 font-bold text-sm">{new Date(rev.scheduledDate).toLocaleDateString('pt-BR')}</p>
                                                    <p className="text-[10px] text-zinc-500 font-mono">{rev.stage} dias</p>
                                                </div>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteRevisionGroup(rev.groupId, rev.id); }} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition cursor-pointer"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'simulados' && (
                     <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Target className="text-red-600"/> Campo de Batalha (Simulados)</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{simulados.map(sim => { const bestResult = simuladoResults.filter(r => r.simuladoId === sim.id).sort((a,b) => b.score - a.score)[0]; const lastResult = simuladoResults.filter(r => r.simuladoId === sim.id).sort((a,b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())[0]; return (<div key={sim.id} className="bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-red-600 transition shadow-sm flex flex-col"><div className="h-32 bg-zinc-800 relative flex items-center justify-center">{sim.coverImage ? <img src={sim.coverImage} className="w-full h-full object-cover opacity-50"/> : <FileText size={48} className="text-zinc-600"/>}<span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">{sim.questionCount} Questões</span></div><div className="p-6 flex-1 flex flex-col"><h3 className="font-bold text-lg dark:text-white mb-2">{sim.title}</h3><p className="text-sm text-zinc-500 mb-4 line-clamp-2">{sim.instructions}</p><div className="mt-auto space-y-3">{bestResult && (<div className="flex justify-between items-center text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-2 rounded"><span>Melhor Nota:</span><span className={`font-bold ${bestResult.score >= 7 ? 'text-green-500' : 'text-red-500'}`}>{bestResult.score.toFixed(1)}</span></div>)}<div className="grid grid-cols-2 gap-2"><button onClick={() => startSimulado(sim)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-sm transition text-center">INICIAR</button>{lastResult && <button onClick={() => startSimulado(sim, true, lastResult.studentAnswers)} className="border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold py-2 rounded text-sm transition text-center">GABARITO</button>}</div></div></div></div>); })}{simulados.length === 0 && <p className="col-span-3 text-center text-zinc-500 italic py-10">Nenhum simulado disponível para o seu plano.</p>}</div></div>
                )}
                {activeTab === 'edital' && (
                     <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-end mb-4"><div><h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><CheckSquare className="text-red-600"/> Edital Verticalizado</h2></div>{editais.length > 1 && (<select value={activeEditalId} onChange={(e) => setActiveEditalId(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-sm outline-none">{editais.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>)}</div>
                     {editais.length === 0 ? <p className="text-zinc-500 italic">Nenhum edital disponível para o seu plano.</p> : (
                     <>
                     <div className="bg-[#18181b] p-4 rounded-xl border border-zinc-800 mb-6"><div className="flex justify-between items-center mb-2"><span className="text-white font-bold text-sm">Progresso Global</span><span className="text-red-500 font-bold text-sm">{calculateEditalProgress()}%</span></div><div className="w-full bg-zinc-800 rounded-full h-2.5"><div className="bg-red-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${calculateEditalProgress()}%` }}></div></div></div><div className="space-y-4">{editais.find(e => e.id === activeEditalId)?.subjects.map(subject => { const subjectTopics = subject.topics.map(t => t.id); const completedCount = editalProgress.filter(p => subjectTopics.includes(p.topicId)).length; const totalCount = subjectTopics.length; const isComplete = totalCount > 0 && completedCount === totalCount; return (<div key={subject.id} className="bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"><div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800"><h3 className="font-bold dark:text-white flex items-center gap-2">{isComplete && <CheckCircle size={16} className="text-green-500"/>}{subject.name}</h3><span className="text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded">{completedCount}/{totalCount}</span></div><div className="divide-y divide-zinc-100 dark:divide-zinc-800">{subject.topics.map(topic => { const isChecked = editalProgress.some(p => p.topicId === topic.id); return (<div key={topic.id} onClick={() => toggleEditalTopic(topic.id)} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition ${isChecked ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}><div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>{isChecked && <Check size={12}/>}</div><span className={`text-sm ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>{topic.name}</span></div>); })}</div></div>); })}</div>
                     </>
                     )}
                     </div>
                )}
                {(activeTab === 'guiado' || activeTab === 'leiseca') && <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">{activeTab === 'guiado' ? <BookOpen className="text-red-600"/> : <Scale className="text-red-500"/>}{activeTab === 'guiado' ? 'Estudo Guiado' : 'Lei Seca'}</h2>{viewState === 'SUBJECTS' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{[...new Set(materials.filter(m => m.category === (activeTab === 'guiado' ? 'GUIDED' : 'LEI_SECA')).map(m => m.subject))].map(subj => (<div key={subj} onClick={() => { setSelectedSubject(subj); setViewState('CONTENT_LIST'); }} className="bg-[#18181b] p-8 rounded-2xl border border-zinc-800 hover:border-zinc-600 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 group flex flex-col items-center justify-center text-center h-64"><div className="w-24 h-24 rounded-full bg-[#09090b] border border-zinc-800 flex items-center justify-center mb-6 group-hover:border-zinc-600 transition-colors">{getSubjectIcon(subj, "text-zinc-400 group-hover:text-white transition-colors duration-300", 40)}</div><h3 className="font-bold text-lg text-white mb-2 group-hover:text-red-500 transition-colors">{subj}</h3></div>))}{materials.filter(m => m.category === (activeTab === 'guiado' ? 'GUIDED' : 'LEI_SECA')).length === 0 && <p className="col-span-4 text-center text-zinc-500 italic py-10">Nenhum material encontrado.</p>}</div>}{viewState === 'CONTENT_LIST' && selectedSubject && <div><button onClick={() => setViewState('SUBJECTS')} className="mb-4 flex items-center gap-1 text-zinc-500 hover:text-red-500"><ChevronLeft size={16}/> Voltar</button><h3 className="text-xl font-bold dark:text-white mb-6 border-l-4 border-red-600 pl-4">{selectedSubject}</h3><div className="space-y-3">{filteredMaterials.map(m => (<div key={m.id} onClick={() => { setViewMaterial(m); setViewState('CONTENT'); }} className="bg-white dark:bg-[#18181b] p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-600 cursor-pointer flex justify-between items-center group"><div><h4 className="font-bold dark:text-white group-hover:text-red-500 transition">{m.title}</h4><p className="text-xs text-zinc-500">{m.topic}</p></div><ChevronRight size={18} className="text-zinc-400"/></div>))}</div></div>}{viewState === 'CONTENT' && viewMaterial && <div className="bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800 p-8"><div className="flex justify-between items-start mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800"><div><button onClick={() => setViewState('CONTENT_LIST')} className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-zinc-500 hover:text-red-500"><ChevronLeft size={14}/> Voltar</button><h2 className="text-2xl font-bold dark:text-white">{viewMaterial.title}</h2><span className="text-sm text-red-600 font-bold">{viewMaterial.subject}</span></div><div className="flex gap-2">{viewMaterial.videoUrl && <a href={viewMaterial.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 transition shadow-lg shadow-red-900/20"><Video size={16}/> Vídeo</a>}{viewMaterial.questionsUrl && <a href={viewMaterial.questionsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"><ListIcon size={16}/> Questões</a>}{viewMaterial.pdfUrl && <a href={viewMaterial.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"><FileText size={16}/> PDF</a>}</div></div><div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: viewMaterial.contentHtml}} /></div>}</div>}
                {activeTab === 'perfil' && <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><UserIcon className="text-red-600"/> Meu Perfil</h2><div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center gap-6"><div className="relative group"><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-700 group-hover:border-red-600 transition">{user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar"/> : <UserIcon className="w-full h-full p-6 text-zinc-500"/>}</div><label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer rounded-full"><Camera className="text-white"/><input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden"/></label></div><div className="flex-1 text-center md:text-left"><h3 className="text-2xl font-bold text-white mb-1">{user.name}</h3><p className="text-zinc-400 mb-4">{user.email}</p><div className="flex flex-wrap gap-2 justify-center md:justify-start">{user.achievements.filter(a => a.unlocked).map(a => (<span key={a.id} className="text-xl" title={a.title}>{a.icon}</span>))}</div></div></div><div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800"><h3 className="text-lg font-bold text-white mb-4">Objetivo</h3><div className="flex gap-4"><input value={objective} onChange={e => setObjective(e.target.value)} className="flex-1 bg-[#09090b] border border-zinc-700 text-white p-3 rounded-lg outline-none focus:border-red-600" placeholder="Qual o seu objetivo?" /><button onClick={saveObjective} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-lg">Salvar</button></div></div>
                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-yellow-500"/> Conquistas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ALL_ACHIEVEMENTS_LIST.map(ach => {
                            const unlocked = user.achievements.some(ua => ua.id === ach.id);
                            return (
                                <div key={ach.id} className={`p-4 rounded-lg border flex flex-col items-center text-center ${unlocked ? 'bg-zinc-800 border-yellow-500/50' : 'bg-zinc-900/50 border-zinc-800 opacity-50'}`}>
                                    <span className="text-3xl mb-2 grayscale-0">{ach.icon}</span>
                                    <h4 className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-zinc-500'}`}>{ach.title}</h4>
                                    <p className="text-[10px] text-zinc-400">{ach.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>}
                {activeTab === 'tutorial' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="mb-6">
                            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                <HelpCircle className="text-red-600" /> Manual do Recruta
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">Instruções para operação da plataforma.</p>
                        </header>
                        {tutorialUrl ? (
                            <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 shadow-xl">
                                <div className="aspect-w-16 aspect-h-9 w-full bg-black rounded-lg overflow-hidden border border-zinc-700">
                                    <iframe 
                                        src={getYoutubeEmbedUrl(tutorialUrl)} 
                                        title="Tutorial da Plataforma"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="w-full h-[500px]"
                                    ></iframe>
                                </div>
                                <div className="mt-4 p-4 bg-zinc-900/50 rounded border border-zinc-800">
                                    <h3 className="font-bold text-white text-lg mb-2">Orientações Gerais</h3>
                                    <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1">
                                        <li>Utilize o Painel Geral para ver seu resumo de desempenho.</li>
                                        <li>Na Sala de Estudos, use o cronômetro para registrar suas horas.</li>
                                        <li>O sistema de revisões agenda automaticamente seus estudos espaçados (1, 7, 14, 30 dias).</li>
                                        <li>Mantenha o foco e a disciplina. Brasil!</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-[#18181b] rounded-xl border border-zinc-800 border-dashed">
                                <HelpCircle size={48} className="mb-4 opacity-50"/>
                                <p>Nenhum vídeo de instrução disponível no momento.</p>
                                <p className="text-xs mt-2">Aguarde as ordens do comando.</p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'trilha' && (
                    hasPremium ? <StudentMentorshipPanel studentId={user.id} /> : <TrilhaVencedor />
                )}
                {activeTab === 'banco_questoes' && (
                    hasPremium ? <QuestionBankPanel studentId={user.id} /> : <div className="relative min-h-screen"><PremiumLock /></div>
                )}
                
                {/* RENDER NEW STUDENT TABS */}
                {activeTab === 'redacao' && <EssayPanel user={user} hasPremium={hasPremium} />}
                {activeTab === 'flashcards' && <FlashcardPanel studentId={user.id} />}
            </main>
        </div>
    );
};

const AdminDashboard = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
    // ... [Previous state declarations] ...
    const [activeTab, setActiveTab] = useState<'dashboard' | 'message' | 'materials' | 'users' | 'editais' | 'simulados' | 'metrics' | 'ranking' | 'plans' | 'mentoria' | 'redacao' | 'banco_questoes_admin' | 'flashcards_admin'>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [stats, setStats] = useState({ users: 0, materials: 0, editais: 0, simulados: 0, questoes: 0 });
    const [message, setMessage] = useState('');
    const [tutorialUrl, setTutorialUrl] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [editais, setEditais] = useState<Edital[]>([]);
    const [simulados, setSimulados] = useState<Simulado[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
    const [rankingData, setRankingData] = useState<any[]>([]);
    const [rankingLoading, setRankingLoading] = useState(false);
    const [rankingPeriod, setRankingPeriod] = useState<'DAILY'|'WEEKLY'|'MONTHLY'|'ANNUAL'>('WEEKLY');
    
    // Admin States
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [newUserPlan, setNewUserPlan] = useState('');
    const [newEditalTitle, setNewEditalTitle] = useState('');
    const [activeEditalId, setActiveEditalId] = useState<string | null>(null);
    const [editalAllowedPlans, setEditalAllowedPlans] = useState<string[]>([]);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [newTopicName, setNewTopicName] = useState('');
    const [editingSimuladoId, setEditingSimuladoId] = useState<string | null>(null);
    const [newSimTitle, setNewSimTitle] = useState('');
    const [newSimPdf, setNewSimPdf] = useState('');
    const [newSimCover, setNewSimCover] = useState('');
    const [newSimKeysObj, setNewSimKeysObj] = useState<Record<number, string>>({});
    const [newSimType, setNewSimType] = useState<'ABCD' | 'ABCDE' | 'CERTO_ERRADO'>('ABCDE');
    const [newSimCount, setNewSimCount] = useState(0);
    const [newSimInstr, setNewSimInstr] = useState('');
    const [newSimMode, setNewSimMode] = useState<'PDF' | 'ONLINE'>('PDF');
    const [simOnlineQuestions, setSimOnlineQuestions] = useState<SimuladoQuestion[]>([]);
    const [simAllowedPlans, setSimAllowedPlans] = useState<string[]>([]);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [newMatTitle, setNewMatTitle] = useState('');
    const [newMatSubject, setNewMatSubject] = useState('');
    const [newMatTopic, setNewMatTopic] = useState('');
    const [newMatCategory, setNewMatCategory] = useState<'GUIDED' | 'LEI_SECA'>('GUIDED');
    const [newMatContent, setNewMatContent] = useState('');
    const [newMatPdf, setNewMatPdf] = useState('');
    const [newMatVideo, setNewMatVideo] = useState('');
    const [newMatQuestions, setNewMatQuestions] = useState('');
    const [matAllowedPlans, setMatAllowedPlans] = useState<string[]>([]);
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanDesc, setNewPlanDesc] = useState('');

    const [onlineQStatement, setOnlineQStatement] = useState('');
    const [onlineQAlternatives, setOnlineQAlternatives] = useState<{label: string, text: string}[]>([]);
    const [onlineQCorrect, setOnlineQCorrect] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const u = await globalRepo.getUsers();
            const m = await globalRepo.getMaterials();
            const e = await globalRepo.getEditais();
            const s = await globalRepo.getSimulados();
            const p = await globalRepo.getPlans();
            const msg = await globalRepo.getCommandMessage();
            const vid = await globalRepo.getTutorialVideo();
            const { count } = await supabase.from('qb_questions').select('*', { count: 'exact', head: true });
            
            setUsers(u); setMaterials(m); setEditais(e); setSimulados(s); setPlans(p); setMessage(msg); setTutorialUrl(vid);
            setStats({ users: u.length, materials: m.length, editais: e.length, simulados: s.length, questoes: count || 0 });
        };
        loadData();
    }, []);

    const toggleAllowedPlan = (planId: string, currentList: string[], setList: (l: string[]) => void) => {
        if (currentList.includes(planId)) setList(currentList.filter(id => id !== planId));
        else setList([...currentList, planId]);
    };
    const loadRankings = async () => { setRankingLoading(true); const data = []; for (const u of users) { if (u.role === UserRole.ADMIN || !u.approved) continue; const [sessions, stats, results] = await Promise.all([userProgressRepo.get(u.id, 'study_sessions', []), userProgressRepo.get(u.id, 'stats', { correct: 0, total: 0 }), userProgressRepo.get(u.id, 'simulado_results', [])]); data.push({ user: u, sessions: sessions as StudySession[], stats: stats as QuestionStats, results: results as SimuladoResult[] }); } setRankingData(data); setRankingLoading(false); };
    useEffect(() => { if (activeTab === 'ranking') loadRankings(); }, [activeTab, users]);
    const getFilteredSeconds = (sessions: StudySession[]) => { const now = new Date(); const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); const startOfYear = new Date(now.getFullYear(), 0, 1); return sessions.reduce((acc, s) => { const sDate = new Date(s.date); if (rankingPeriod === 'DAILY' && sDate >= startOfDay) return acc + s.durationSeconds; if (rankingPeriod === 'WEEKLY' && sDate >= startOfWeek) return acc + s.durationSeconds; if (rankingPeriod === 'MONTHLY' && sDate >= startOfMonth) return acc + s.durationSeconds; if (rankingPeriod === 'ANNUAL' && sDate >= startOfYear) return acc + s.durationSeconds; return acc; }, 0); };
    const sortedByHours = [...rankingData].sort((a,b) => getFilteredSeconds(b.sessions) - getFilteredSeconds(a.sessions)).slice(0, 10);
    const handleApproveUser = async (id: string, planId?: string) => { const target = users.find(u => u.id === id); if (target) { const updated = { ...target, approved: true, planId: planId || target.planId }; await globalRepo.saveUser(updated); setUsers(users.map(u => u.id === id ? updated : u)); } };
    
    // ACTION: APROVAR TODOS
    const handleApproveAll = async () => {
        if(!window.confirm("ATENÇÃO COMANDANTE: Isso aprovará IMEDIATAMENTE todos os alunos pendentes. Confirmar?")) return;
        try {
            const { error } = await supabase.from('users').update({ approved: true }).eq('role', 'STUDENT');
            if(error) throw error;
            setUsers(users.map(u => u.role === 'STUDENT' ? { ...u, approved: true } : u));
            alert("Tropa liberada! Todos os alunos foram aprovados.");
        } catch (e: any) {
            alert("Erro ao aprovar em massa: " + e.message);
        }
    };

    const handleRejectUser = async (id: string) => { if (!window.confirm('Rejeitar/Excluir usuário?')) return; await globalRepo.deleteUser(id); setUsers(users.filter(u => u.id !== id)); };
    
    // SIMPLIFIED CREATE USER FOR ADMIN
    const handleCreateUser = async () => { 
        if (!newUserName || !newUserEmail || !newUserPass) return; 
        try {
            // Criação direta na tabela users
            const { data, error } = await supabase.from('users').insert({
                email: newUserEmail,
                password: newUserPass,
                name: newUserName,
                role: 'STUDENT',
                approved: true, // Já aprovado pois foi o admin que criou
                achievements: [],
                study_streak: 0
            }).select().single();

            if (error) throw error;
            
            if (data) {
                alert('Aluno cadastrado e JÁ APROVADO com sucesso!');
                // Refresh list
                const u = await globalRepo.getUsers();
                setUsers(u);
            }
            
            setNewUserName(''); setNewUserEmail(''); setNewUserPass(''); 
        } catch (err: any) {
            alert("Erro: " + err.message);
        }
    };
    
    // ... [Rest of AdminDashboard functions: Plans, Materials, etc.] ...
    const handleAddPlan = async () => { if (!newPlanName) return; const newPlan: Plan = { id: Date.now().toString(), name: newPlanName, description: newPlanDesc }; const updatedPlans = [...plans, newPlan]; await globalRepo.savePlans(updatedPlans); setPlans(updatedPlans); setNewPlanName(''); setNewPlanDesc(''); };
    const handleDeletePlan = async (id: string) => { if(!window.confirm('Excluir plano?')) return; const updatedPlans = plans.filter(p => p.id !== id); await globalRepo.savePlans(updatedPlans); setPlans(updatedPlans); };
    const handleAddEdital = async () => { if (!newEditalTitle) return; const newEdital: Edital = { id: Date.now().toString(), title: newEditalTitle, subjects: [], allowedPlanIds: editalAllowedPlans }; await globalRepo.saveEdital(newEdital); setEditais([...editais, newEdital]); setNewEditalTitle(''); setEditalAllowedPlans([]); };
    const handleDeleteEdital = async (id: string) => { if (!window.confirm('Excluir?')) return; await globalRepo.deleteEdital(id); setEditais(editais.filter(e => e.id !== id)); };
    const updateEdital = async (edital: Edital) => { await globalRepo.saveEdital(edital); setEditais(editais.map(e => e.id === edital.id ? edital : e)); };
    const handleAddSubject = () => { if (!activeEditalId || !newSubjectName) return; const edital = editais.find(e => e.id === activeEditalId); if (edital) { updateEdital({ ...edital, subjects: [...edital.subjects, { id: Date.now().toString(), name: newSubjectName, topics: [] }] }); setNewSubjectName(''); } };
    const handleDeleteSubject = async (subjectId: string) => { if (!activeEditalId || !window.confirm('Tem certeza que deseja remover esta matéria e todos os seus tópicos?')) return; const edital = editais.find(e => e.id === activeEditalId); if (edital) { const updatedSubjects = edital.subjects.filter(s => s.id !== subjectId); updateEdital({ ...edital, subjects: updatedSubjects }); if (selectedSubjectId === subjectId) setSelectedSubjectId(null); } };
    const handleAddTopic = () => { if (!activeEditalId || !selectedSubjectId || !newTopicName) return; const edital = editais.find(e => e.id === activeEditalId); if (edital) { const newSubjects = edital.subjects.map(s => s.id === selectedSubjectId ? { ...s, topics: [...s.topics, { id: Date.now().toString(), name: newTopicName }] } : s); updateEdital({ ...edital, subjects: newSubjects }); setNewTopicName(''); } };
    const handleDeleteTopic = async (subjectId: string, topicId: string) => { if (!activeEditalId || !window.confirm('Remover tópico?')) return; const edital = editais.find(e => e.id === activeEditalId); if (edital) { const newSubjects = edital.subjects.map(s => { if (s.id === subjectId) { return { ...s, topics: s.topics.filter(t => t.id !== topicId) }; } return s; }); updateEdital({ ...edital, subjects: newSubjects }); } };
    const getOptions = (type: 'ABCD' | 'ABCDE' | 'CERTO_ERRADO') => { if (type === 'ABCD') return ['A', 'B', 'C', 'D']; if (type === 'CERTO_ERRADO') return ['C', 'E']; return ['A', 'B', 'C', 'D', 'E']; };
    const handleEditSimulado = (sim: Simulado) => { setEditingSimuladoId(sim.id); setNewSimTitle(sim.title); setNewSimPdf(sim.pdfUrl || ''); setNewSimCover(sim.coverImage || ''); setNewSimType(sim.type); setNewSimCount(sim.questionCount); setNewSimInstr(sim.instructions); setSimAllowedPlans(sim.allowedPlanIds || []); setNewSimMode(sim.mode || 'PDF'); setSimOnlineQuestions(sim.questions || []); const keysObj: Record<number, string> = {}; if (sim.answerKey) sim.answerKey.split(',').forEach(part => { const match = part.match(/(\d+)([A-Z])/); if (match) keysObj[parseInt(match[1])] = match[2]; }); setNewSimKeysObj(keysObj); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleCancelEdit = () => { setEditingSimuladoId(null); setNewSimTitle(''); setNewSimPdf(''); setNewSimCover(''); setNewSimKeysObj({}); setNewSimCount(0); setNewSimInstr(''); setNewSimType('ABCDE'); setSimAllowedPlans([]); setNewSimMode('PDF'); setSimOnlineQuestions([]); };
    const handleAddOnlineQuestion = () => {
        if (!onlineQStatement || !onlineQCorrect) return alert("Preencha enunciado e gabarito.");
        const newQ: SimuladoQuestion = {
            id: Date.now().toString(),
            text: onlineQStatement,
            alternatives: onlineQAlternatives,
            correctAnswer: onlineQCorrect
        };
        setSimOnlineQuestions([...simOnlineQuestions, newQ]);
        setOnlineQStatement('');
        setOnlineQCorrect('');
        initOnlineAlternatives(newSimType);
    };
    const initOnlineAlternatives = (t: string) => {
        if (t === 'CERTO_ERRADO') setOnlineQAlternatives([{label:'C', text:'Certo'}, {label:'E', text:'Errado'}]);
        else if (t === 'ABCD') setOnlineQAlternatives(['A','B','C','D'].map(l=>({label:l, text:''})));
        else setOnlineQAlternatives(['A','B','C','D','E'].map(l=>({label:l, text:''})));
    };
    useEffect(() => { initOnlineAlternatives(newSimType); }, [newSimType]);

    const handleSaveSimulado = async () => { 
        if(!newSimTitle) return;
        let finalCount = newSimCount;
        let generatedKeys = "";

        if (newSimMode === 'ONLINE') {
            finalCount = simOnlineQuestions.length;
            generatedKeys = simOnlineQuestions.map((q, i) => `${i+1}${q.correctAnswer}`).join(',');
        } else {
            if(!newSimCount) return alert("Defina a quantidade de questões.");
            generatedKeys = Object.entries(newSimKeysObj).map(([q, ans]) => `${q}${ans}`).join(',');
        }

        const newSim: Simulado = { id: editingSimuladoId || Date.now().toString(), title: newSimTitle, pdfUrl: newSimPdf, coverImage: newSimCover, answerKey: generatedKeys, questionCount: Number(finalCount), type: newSimType, instructions: newSimInstr, allowedPlanIds: simAllowedPlans, mode: newSimMode, questions: newSimMode === 'ONLINE' ? simOnlineQuestions : undefined }; 
        await globalRepo.saveSimulado(newSim); 
        if (editingSimuladoId) setSimulados(simulados.map(s => s.id === newSim.id ? newSim : s)); 
        else setSimulados([...simulados, newSim]); 
        handleCancelEdit(); 
        alert(editingSimuladoId ? 'Atualizado!' : 'Criado!'); 
    };
    const handleDeleteSimulado = async (e: React.MouseEvent, id: string) => { e.preventDefault(); e.stopPropagation(); if(!window.confirm('Excluir?')) return; await globalRepo.deleteSimulado(id); setSimulados(simulados.filter(s => s.id !== id)); };
    const handleSaveMessage = async () => { await globalRepo.saveCommandMessage(message); alert('Mensagem salva!'); };
    const handleSaveVideo = async () => { await globalRepo.saveTutorialVideo(tutorialUrl); alert('Vídeo de tutorial salvo!'); };
    const handleEditMaterial = (mat: Material) => { setEditingMaterialId(mat.id); setNewMatTitle(mat.title); setNewMatSubject(mat.subject); setNewMatTopic(mat.topic || ''); setNewMatCategory(mat.category); setNewMatContent(mat.contentHtml); setNewMatPdf(mat.pdfUrl || ''); setNewMatVideo(mat.videoUrl || ''); setNewMatQuestions(mat.questionsUrl || ''); setMatAllowedPlans(mat.allowedPlanIds || []); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleCancelMaterialEdit = () => { setEditingMaterialId(null); setNewMatTitle(''); setNewMatSubject(''); setNewMatTopic(''); setNewMatContent(''); setNewMatPdf(''); setNewMatVideo(''); setNewMatQuestions(''); setNewMatCategory('GUIDED'); setMatAllowedPlans([]); };
    const handleMoveMaterial = async (mat: Material, direction: 'up' | 'down') => { const subjectMaterials = materials.filter(m => m.subject === mat.subject).sort((a, b) => (a.order || 0) - (b.order || 0)); const currentIndex = subjectMaterials.findIndex(m => m.id === mat.id); if (currentIndex === -1) return; let targetIndex = -1; if (direction === 'up' && currentIndex > 0) targetIndex = currentIndex - 1; if (direction === 'down' && currentIndex < subjectMaterials.length - 1) targetIndex = currentIndex + 1; if (targetIndex !== -1) { const updatedBatch = [...subjectMaterials]; updatedBatch.forEach((m, idx) => m.order = idx); const temp = updatedBatch[currentIndex]; updatedBatch[currentIndex] = updatedBatch[targetIndex]; updatedBatch[targetIndex] = temp; updatedBatch.forEach((m, idx) => m.order = idx); await globalRepo.saveMaterials(updatedBatch); const otherMaterials = materials.filter(m => m.subject !== mat.subject); setMaterials([...otherMaterials, ...updatedBatch]); } };
    const handleSaveMaterial = async () => { if (!newMatTitle || !newMatSubject) { alert('Preencha Título e Matéria.'); return; } const subjectMaterials = materials.filter(m => m.subject === newMatSubject); const maxOrder = subjectMaterials.reduce((max, m) => Math.max(max, m.order || 0), -1); const materialToSave: Material = { id: editingMaterialId || Date.now().toString(), title: newMatTitle, subject: newMatSubject, topic: newMatTopic, category: newMatCategory, contentHtml: newMatContent, pdfUrl: newMatPdf, videoUrl: newMatVideo, questionsUrl: newMatQuestions, dateAdded: editingMaterialId ? (materials.find(m => m.id === editingMaterialId)?.dateAdded || new Date().toISOString()) : new Date().toISOString(), order: editingMaterialId ? (materials.find(m => m.id === editingMaterialId)?.order || 0) : maxOrder + 1, allowedPlanIds: matAllowedPlans }; await globalRepo.saveMaterials([materialToSave]); if (editingMaterialId) { setMaterials(materials.map(m => m.id === editingMaterialId ? materialToSave : m)); alert('Material atualizado!'); } else { setMaterials([...materials, materialToSave]); alert('Material adicionado!'); } handleCancelMaterialEdit(); };
    const handleDeleteMaterial = async (e: React.MouseEvent, id: string) => { e.preventDefault(); e.stopPropagation(); if(window.confirm('Excluir?')) { await globalRepo.deleteMaterial(id); setMaterials(materials.filter(m => m.id !== id)); } };
    const toggleSubjectExpand = (subject: string) => { if (expandedSubjects.includes(subject)) { setExpandedSubjects(expandedSubjects.filter(s => s !== subject)); } else { setExpandedSubjects([...expandedSubjects, subject]); } };
    const handleSubjectVisibilityChange = async (subject: string, planId: string, isChecked: boolean) => { const targetMaterials = materials.filter(m => m.subject === subject); const updatedBatch = targetMaterials.map(m => { const currentPlans = m.allowedPlanIds || []; let newPlans: string[] = []; if (isChecked) { newPlans = currentPlans.includes(planId) ? currentPlans : [...currentPlans, planId]; } else { newPlans = currentPlans.filter(id => id !== planId); } return { ...m, allowedPlanIds: newPlans }; }); const otherMaterials = materials.filter(m => m.subject !== subject); setMaterials([...otherMaterials, ...updatedBatch]); await globalRepo.saveMaterials(updatedBatch); };
    const materialsBySubject = materials.reduce((acc, mat) => { if (!acc[mat.subject]) acc[mat.subject] = []; acc[mat.subject].push(mat); return acc; }, {} as Record<string, Material[]>);
    const sortedSubjects = Object.keys(materialsBySubject).sort();
    const pendingUsers = users.filter(u => u.role === UserRole.STUDENT && !u.approved);
    const activeUsers = users.filter(u => u.role === UserRole.STUDENT && u.approved);

    const handleChangeUserPlan = async (userId: string, newPlanId: string) => {
        const target = users.find(u => u.id === userId);
        if (target) {
            const planIdToSave = newPlanId === "" ? undefined : newPlanId;
            const updatedUser = { ...target, planId: planIdToSave };
            await globalRepo.saveUser(updatedUser);
            setUsers(users.map(u => u.id === userId ? updatedUser : u));
        }
    };

    if (viewingStudentId) {
        const targetStudent = users.find(u => u.id === viewingStudentId);
        if (targetStudent) {
            return (
                <div className="fixed inset-0 z-[100] bg-[#09090b] overflow-y-auto">
                     <div className="sticky top-0 z-50 bg-red-900 text-white p-4 flex justify-between items-center shadow-lg border-b border-red-700">
                        <span className="font-bold flex items-center gap-2 text-lg"><ShieldAlert className="text-white"/> MODO DE OBSERVAÇÃO: {targetStudent.name}</span>
                        <button onClick={() => setViewingStudentId(null)} className="bg-white text-red-900 px-6 py-2 rounded font-bold hover:bg-zinc-200 transition shadow-lg">RETORNAR AO COMANDO</button>
                     </div>
                     <StudentDashboard user={targetStudent} onLogout={() => setViewingStudentId(null)} updateProfile={() => {}} readOnly={true} />
                </div>
            );
        }
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200">
            <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex flex-col fixed h-full z-40 transition-all duration-300`}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className={`flex items-center gap-2 font-bold text-xl dark:text-white ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                        <img src="https://i.ibb.co/HpqZMgsQ/image.png" className={`h-auto transition-all ${isSidebarCollapsed ? 'w-10' : 'w-16'}`} alt="Logo" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}/>
                        {!isSidebarCollapsed && <span>SANGUE MILICO</span>}
                    </div>
                    {!isSidebarCollapsed && <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-zinc-500 hover:text-white"><ChevronLeft size={20}/></button>}
                </div>
                {isSidebarCollapsed && (
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex justify-center py-2 text-zinc-500 hover:text-white hover:bg-zinc-800"><ChevronRight size={20}/></button>
                )}
                <nav className="flex-1 p-2 space-y-1">
                    {[
                        {id: 'dashboard', label: 'Painel', icon: <LayoutDashboard size={18}/>},
                        {id: 'ranking', label: 'Ranking', icon: <Medal size={18}/>},
                        {id: 'metrics', label: 'Intel. Tropa', icon: <Activity size={18}/>},
                        {id: 'plans', label: 'Gestão Planos', icon: <Layers size={18}/>},
                        {id: 'mentoria', label: 'Mentoria', icon: <Map size={18}/>},
                        {id: 'banco_questoes_admin', label: 'Gestão Questões', icon: <Database size={18}/>},
                        {id: 'redacao', label: 'Redação', icon: <PenTool size={18}/>},
                        {id: 'flashcards_admin', label: 'Admin Flashcards', icon: <Layers size={18}/>}, // NEW
                        {id: 'message', label: 'Comunicação', icon: <MessageCircle size={18}/>},
                        {id: 'editais', label: 'Gestão Editais', icon: <List size={18}/>},
                        {id: 'simulados', label: 'Gestão Simulados', icon: <FileText size={18}/>},
                        {id: 'materials', label: 'Materiais', icon: <BookOpen size={18}/>},
                        {id: 'users', label: 'Alunos', icon: <Users size={18}/>}
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'bg-red-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? item.label : ''}>
                            {item.icon}
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800"><button onClick={onLogout} className={`flex items-center gap-2 text-zinc-500 hover:text-red-500 w-full px-2 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Sair"><LogOut size={16} /> {!isSidebarCollapsed && 'Sair'}</button></div>
            </aside>
            <main className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-5 gap-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-500 text-sm font-bold uppercase">Alunos Ativos</h3><p className="text-3xl font-bold dark:text-white">{activeUsers.length}</p></div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-500 text-sm font-bold uppercase">Materiais</h3><p className="text-3xl font-bold dark:text-white">{materials.length}</p></div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-500 text-sm font-bold uppercase">Editais</h3><p className="text-3xl font-bold dark:text-white">{editais.length}</p></div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-500 text-sm font-bold uppercase">Simulados</h3><p className="text-3xl font-bold dark:text-white">{simulados.length}</p></div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-500 text-sm font-bold uppercase">Banco Questões</h3><p className="text-3xl font-bold dark:text-white">{stats.questoes}</p></div>
                        
                        {pendingUsers.length > 0 && <div className="col-span-5 bg-red-900/20 border border-red-900 p-4 rounded-xl flex items-center justify-between"><span className="text-red-200 font-bold flex items-center gap-2"><ShieldAlert/> Existem {pendingUsers.length} solicitações pendentes.</span><button onClick={() => setActiveTab('users')} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700">Verificar</button></div>}
                    </div>
                )}
                {/* ... (rest of admin dashboard content) ... */}
                {activeTab === 'ranking' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Trophy className="text-yellow-500"/> Hall da Fama</h2>
                            <button onClick={loadRankings} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition" title="Atualizar Ranking"><RefreshCw size={18} className={rankingLoading ? "animate-spin" : ""} /></button>
                        </div>
                        {rankingLoading ? <p className="text-zinc-500 text-center py-10">Carregando dados da tropa...</p> : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg lg:col-span-2">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><Clock className="text-blue-500"/> Maior Dedicação (Horas)</h3>
                                        <select value={rankingPeriod} onChange={(e) => setRankingPeriod(e.target.value as any)} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded p-1 text-xs font-bold outline-none text-zinc-700 dark:text-zinc-300">
                                            <option value="DAILY">Hoje</option>
                                            <option value="WEEKLY">Semana</option>
                                            <option value="MONTHLY">Mês</option>
                                            <option value="ANNUAL">Ano</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sortedByHours.map((item, idx) => {
                                            const totalHours = getFilteredSeconds(item.sessions) / 3600;
                                            return (
                                            <div key={item.user.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md ${idx === 0 ? 'bg-yellow-500 text-white' : (idx === 1 ? 'bg-zinc-400 text-white' : (idx === 2 ? 'bg-orange-700 text-white' : 'bg-zinc-700 text-zinc-400'))}`}>{idx === 0 ? <Crown size={20}/> : idx + 1}</div>
                                                    <div>
                                                        <span className="font-bold dark:text-white block">{item.user.name}</span>
                                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{getRankByHours(item.user.achievements.length > 0 ? totalHours : 0)}</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-bold text-blue-500 text-lg">{formatTime(getFilteredSeconds(item.sessions))}</span>
                                            </div>
                                        )})}
                                        {sortedByHours.length === 0 && <p className="col-span-2 text-zinc-500 text-xs italic text-center py-4">Sem dados para este período.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'metrics' && (
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                             <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2"><Activity className="text-red-600"/> Inteligência da Tropa (Métricas Individuais)</h3>
                             <p className="text-zinc-500 text-sm mb-6">Selecione um combatente para visualizar seu relatório de desempenho detalhado (Modo Observador).</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeUsers.map(u => (
                                    <div key={u.id} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800 hover:border-red-600 transition cursor-pointer flex items-center justify-between group" onClick={() => setViewingStudentId(u.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold group-hover:bg-red-600 transition">{u.name.charAt(0)}</div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{u.name}</p>
                                                <p className="text-xs text-zinc-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <button className="text-zinc-500 group-hover:text-white"><Eye size={18}/></button>
                                    </div>
                                ))}
                                {activeUsers.length === 0 && <p className="text-zinc-500 italic">Nenhum aluno ativo no momento.</p>}
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'mentoria' && <AdminMentorshipPanel users={users} plans={plans} />}
                
                {/* RENDER NEW ADMIN TABS */}
                {activeTab === 'redacao' && <EssayPanel user={user} />}
                {activeTab === 'banco_questoes_admin' && <AdminQuestionManager />}
                {activeTab === 'flashcards_admin' && <AdminFlashcardPanel user={user} />}

                {activeTab === 'plans' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold dark:text-white mb-4">Criar Novo Plano de Estudo</h3>
                            <div className="flex gap-4 items-center">
                                <input type="text" placeholder="Nome do Plano (ex: Oficial)" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="Descrição (opcional)" value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} className="flex-[2] bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-zinc-800 dark:text-white" />
                                <button onClick={handleAddPlan} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700">Adicionar</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 relative group hover:border-red-600 transition">
                                    <h3 className="text-xl font-bold dark:text-white">{plan.name}</h3>
                                    <p className="text-zinc-500 text-sm mt-2">{plan.description || "Sem descrição."}</p>
                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => handleDeletePlan(plan.id)} className="bg-red-900/20 text-red-500 px-3 py-1 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition">Excluir</button>
                                        <div className="text-xs text-zinc-500 px-3 py-1 flex items-center gap-1"><Users size={12}/> {users.filter(u => u.planId === plan.id).length} alunos</div>
                                    </div>
                                </div>
                            ))}
                            {plans.length === 0 && <p className="col-span-3 text-center text-zinc-500 italic py-10">Nenhum plano cadastrado. Todo o conteúdo será Global.</p>}
                        </div>
                    </div>
                )}
                {/* ... existing code for other tabs (message, editais, simulados, materials, users) remains here ... */}
                {activeTab === 'message' && <div className="space-y-6 max-w-2xl"><div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Aviso Geral</h3><RichTextEditor value={message} onChange={setMessage} /><button onClick={handleSaveMessage} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">Salvar Aviso</button></div><div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Tutorial da Plataforma</h3><div className="flex gap-2"><input type="text" placeholder="Cole o link do YouTube aqui (ex: https://youtu.be/...)" value={tutorialUrl} onChange={e => setTutorialUrl(e.target.value)} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-zinc-800 dark:text-white" /><button onClick={handleSaveVideo} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Salvar Vídeo</button></div><p className="text-xs text-zinc-500 mt-2">Dica: Envie um vídeo "Não Listado" no YouTube e cole o link aqui.</p></div></div>}
                {activeTab === 'editais' && <div className="space-y-8"><div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Criar Novo Edital</h3><div className="flex gap-4"><input value={newEditalTitle} onChange={e => setNewEditalTitle(e.target.value)} placeholder="Nome" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded dark:text-white" /><button onClick={handleAddEdital} className="bg-green-600 text-white px-6 rounded hover:bg-green-700">Criar</button></div><div className="mt-3 flex gap-2 flex-wrap text-sm text-zinc-400 items-center"><span>Visibilidade:</span>{plans.map(p => (<label key={p.id} className="flex items-center gap-1 cursor-pointer bg-zinc-800 px-2 py-1 rounded border border-zinc-700"><input type="checkbox" checked={editalAllowedPlans.includes(p.id)} onChange={() => toggleAllowedPlan(p.id, editalAllowedPlans, setEditalAllowedPlans)} /> {p.name}</label>))}</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Editais</h3><div className="space-y-2">{editais.map(e => (<div key={e.id} onClick={() => setActiveEditalId(e.id)} className={`p-3 border rounded cursor-pointer flex justify-between items-center ${activeEditalId === e.id ? 'border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-zinc-700'}`}><span className="dark:text-white font-bold">{e.title}</span><button onClick={(ev) => { ev.stopPropagation(); handleDeleteEdital(e.id); }} className="text-red-500"><Trash2 size={16}/></button></div>))}</div></div>{activeEditalId && <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Conteúdo</h3><div className="flex gap-2 mb-4"><input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Matéria" className="flex-1 bg-zinc-800 border border-zinc-700 p-2 rounded text-white text-sm" /><button onClick={handleAddSubject} className="bg-blue-600 text-white px-3 rounded text-sm">Add</button></div><div className="space-y-4 max-h-[400px] overflow-y-auto">{editais.find(e => e.id === activeEditalId)?.subjects.map(s => (<div key={s.id} className="border border-zinc-700 p-3 rounded bg-zinc-800/50"><div className="flex justify-between items-center mb-2"><span className="font-bold text-white text-sm">{s.name}</span><div className="flex gap-2"><button onClick={() => setSelectedSubjectId(s.id)} className={`text-xs px-2 py-1 rounded ${selectedSubjectId === s.id ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>Select</button><button onClick={() => handleDeleteSubject(s.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16}/></button></div></div><ul className="pl-4 list-disc text-xs text-zinc-400 space-y-1">{s.topics.map(t => <li key={t.id} className="flex justify-between items-center group"><span>{t.name}</span><button onClick={() => handleDeleteTopic(s.id, t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition"><XCircle size={14}/></button></li>)}</ul>{selectedSubjectId === s.id && <div className="flex gap-2 mt-2"><input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Novo Tópico" className="flex-1 bg-zinc-900 border border-zinc-700 p-1 rounded text-white text-xs" /><button onClick={handleAddTopic} className="bg-green-600 text-white px-2 rounded text-xs">+</button></div>}</div>))}</div></div>}</div></div>}
                
                {/* SIMULADO ADMIN AREA UPDATED */}
                {activeTab === 'simulados' && (
                     <div className="space-y-8">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                             <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold dark:text-white">{editingSimuladoId ? 'Editar' : 'Adicionar'} Simulado</h3>{editingSimuladoId && <button onClick={handleCancelEdit} className="text-sm text-zinc-500 hover:text-red-500 underline">Cancelar</button>}</div>
                             <div className="grid grid-cols-2 gap-4 mb-4">
                                 <input value={newSimTitle} onChange={e => setNewSimTitle(e.target.value)} placeholder="Título" className="bg-zinc-800 border border-zinc-700 p-2 rounded text-white" />
                                 <select value={newSimMode} onChange={e => setNewSimMode(e.target.value as any)} className="bg-zinc-800 border border-zinc-700 p-2 rounded text-white">
                                     <option value="PDF">Tipo: PDF / Arquivo</option>
                                     <option value="ONLINE">Tipo: Manual / Online</option>
                                 </select>
                                 <input value={newSimCover} onChange={e => setNewSimCover(e.target.value)} placeholder="URL Capa" className="bg-zinc-800 border border-zinc-700 p-2 rounded text-white" />
                                 
                                 {newSimMode === 'PDF' && (
                                     <input value={newSimPdf} onChange={e => setNewSimPdf(e.target.value)} placeholder="URL PDF" className="bg-zinc-800 border border-zinc-700 p-2 rounded text-white" />
                                 )}
                             </div>
                             
                             <div className="flex gap-4 mb-4">
                                 <select value={newSimType} onChange={e => { setNewSimType(e.target.value as any); setNewSimKeysObj({}); }} className="bg-zinc-800 border border-zinc-700 p-2 rounded text-white"><option value="ABCDE">ABCDE</option><option value="ABCD">ABCD</option><option value="CERTO_ERRADO">Certo/Errado</option></select>
                                 <input value={newSimInstr} onChange={e => setNewSimInstr(e.target.value)} placeholder="Instruções" className="flex-1 bg-zinc-800 border border-zinc-700 p-2 rounded text-white" />
                             </div>
                             
                             {newSimMode === 'PDF' && (
                                 <div className="mb-4">
                                     <label className="text-xs text-zinc-500 uppercase font-bold">Quantidade de Questões (PDF)</label>
                                     <input type="number" value={newSimCount} onChange={e => { const val = Number(e.target.value); setNewSimCount(val); if (!editingSimuladoId) setNewSimKeysObj({}); }} placeholder="Qtd" className="w-full bg-zinc-800 border border-zinc-700 p-2 rounded text-white mt-1" />
                                 </div>
                             )}

                             <div className="mb-4 text-sm text-zinc-400"><span>Visibilidade:</span> <div className="flex gap-2 mt-1">{plans.map(p => (<label key={p.id} className="inline-flex items-center gap-1 cursor-pointer bg-zinc-800 px-2 py-1 rounded border border-zinc-700"><input type="checkbox" checked={simAllowedPlans.includes(p.id)} onChange={() => toggleAllowedPlan(p.id, simAllowedPlans, setSimAllowedPlans)} /> {p.name}</label>))}</div></div>
                             
                             {/* ONLINE QUESTIONS BUILDER */}
                             {newSimMode === 'ONLINE' && (
                                 <div className="mb-6 p-4 border border-zinc-700 rounded bg-zinc-800/30">
                                     <h4 className="text-white font-bold mb-3 text-sm uppercase flex items-center gap-2"><Plus size={16}/> Adicionar Questão ao Simulado</h4>
                                     <textarea 
                                         value={onlineQStatement}
                                         onChange={e => setOnlineQStatement(e.target.value)}
                                         placeholder="Enunciado da questão..."
                                         className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white mb-2 h-20"
                                     />
                                     <div className="space-y-2 mb-3">
                                         {onlineQAlternatives.map((alt, idx) => (
                                             <div key={idx} className="flex gap-2 items-center">
                                                 <span className="font-bold w-6 text-center text-zinc-500">{alt.label}</span>
                                                 <input 
                                                     value={alt.text} 
                                                     onChange={e => {
                                                         const updated = [...onlineQAlternatives];
                                                         updated[idx].text = e.target.value;
                                                         setOnlineQAlternatives(updated);
                                                     }}
                                                     readOnly={newSimType === 'CERTO_ERRADO'}
                                                     className={`flex-1 bg-zinc-900 border border-zinc-700 rounded p-1 text-white text-sm ${newSimType === 'CERTO_ERRADO' ? 'opacity-50' : ''}`}
                                                 />
                                                 <button 
                                                     onClick={() => setOnlineQCorrect(alt.label)}
                                                     className={`w-6 h-6 rounded border flex items-center justify-center text-xs ${onlineQCorrect === alt.label ? 'bg-green-600 border-green-600 text-white' : 'border-zinc-600 text-zinc-500'}`}
                                                 >✓</button>
                                             </div>
                                         ))}
                                     </div>
                                     <button onClick={handleAddOnlineQuestion} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-xs font-bold w-full mb-4">Adicionar Questão</button>
                                     
                                     {/* LIST OF ADDED QUESTIONS */}
                                     {simOnlineQuestions.length > 0 && (
                                         <div className="space-y-2">
                                             <p className="text-xs font-bold text-zinc-500 uppercase">Questões Cadastradas ({simOnlineQuestions.length})</p>
                                             {simOnlineQuestions.map((q, i) => (
                                                 <div key={i} className="bg-zinc-900 p-2 rounded border border-zinc-800 flex justify-between items-center">
                                                     <div className="truncate flex-1 pr-2">
                                                         <span className="font-bold mr-2 text-zinc-400">{i+1}.</span>
                                                         <span className="text-zinc-300 text-sm">{q.text}</span>
                                                     </div>
                                                     <span className="text-xs font-bold text-green-500 border border-green-900 bg-green-900/20 px-2 rounded mr-2">Gab: {q.correctAnswer}</span>
                                                     <button onClick={() => setSimOnlineQuestions(simOnlineQuestions.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* PDF ANSWER KEY BUILDER */}
                             {newSimMode === 'PDF' && newSimCount > 0 && (
                                 <div className="mb-6 p-4 border border-zinc-700 rounded bg-zinc-800/50"><h4 className="text-white font-bold mb-3 text-sm uppercase">Gabarito (PDF):</h4><div className="grid grid-cols-5 gap-3 max-h-[300px] overflow-y-auto">{Array.from({length: newSimCount}).map((_, i) => (<div key={i+1} className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-700"><span className="text-xs font-bold text-zinc-400 w-5">{i+1}</span><div className="flex gap-1">{getOptions(newSimType).map(opt => (<button key={opt} onClick={() => setNewSimKeysObj(prev => ({...prev, [i+1]: opt}))} className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition ${newSimKeysObj[i+1] === opt ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>{opt === 'A' && newSimType === 'CERTO_ERRADO' ? 'C' : (opt === 'B' && newSimType === 'CERTO_ERRADO' ? 'E' : opt)}</button>))}</div></div>))}</div></div>
                             )}
                             
                             <button onClick={handleSaveSimulado} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold w-full md:w-auto">{editingSimuladoId ? 'Salvar' : 'Publicar'}</button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"><h3 className="text-xl font-bold dark:text-white mb-4">Simulados Ativos</h3><div className="space-y-2">{simulados.map(s => (<div key={s.id} className={`flex justify-between items-center p-3 border rounded ${editingSimuladoId === s.id ? 'border-blue-500 bg-blue-900/10' : 'border-zinc-700 bg-zinc-800/50'}`}><div className="flex items-center gap-3">{s.coverImage && <img src={s.coverImage} className="w-10 h-10 object-cover rounded" alt="capa"/>}<div><p className="text-white font-bold">{s.title}</p><p className="text-xs text-zinc-400">{s.questionCount} Qs - {s.type} - <span className="text-blue-400 font-bold">{s.mode || 'PDF'}</span></p></div></div><div className="flex gap-2"><button onClick={() => handleEditSimulado(s)} className="text-blue-500 p-2"><Edit3 size={18}/></button><button onClick={(e) => handleDeleteSimulado(e, s.id)} className="text-red-500 p-2"><Trash2 size={18}/></button></div></div>))}</div></div>
                     </div>
                )}

                {activeTab === 'materials' && (
                    <div className="space-y-8">
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold dark:text-white mb-4">{editingMaterialId ? 'Editar Material' : 'Novo Material'}</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input type="text" placeholder="Título" value={newMatTitle} onChange={e => setNewMatTitle(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="Matéria" value={newMatSubject} onChange={e => setNewMatSubject(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="Tópico" value={newMatTopic} onChange={e => setNewMatTopic(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <select value={newMatCategory} onChange={e => setNewMatCategory(e.target.value as any)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white"><option value="GUIDED">Estudo Guiado</option><option value="LEI_SECA">Lei Seca</option></select>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <input type="text" placeholder="URL PDF" value={newMatPdf} onChange={e => setNewMatPdf(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="URL Vídeo" value={newMatVideo} onChange={e => setNewMatVideo(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="URL Questões" value={newMatQuestions} onChange={e => setNewMatQuestions(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 dark:text-zinc-300">Visibilidade (Planos)</label>
                                <div className="flex flex-wrap gap-2">
                                    {plans.map(plan => (
                                        <button 
                                            key={plan.id}
                                            onClick={() => toggleAllowedPlan(plan.id, matAllowedPlans, setMatAllowedPlans)}
                                            className={`px-3 py-1 rounded text-xs border ${matAllowedPlans.includes(plan.id) ? 'bg-red-600 text-white border-red-600' : 'border-zinc-600 text-zinc-400'}`}
                                        >
                                            {plan.name}
                                        </button>
                                    ))}
                                    {plans.length === 0 && <span className="text-xs text-zinc-500">Crie planos primeiro para restringir conteúdo.</span>}
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">Se nenhum plano for selecionado, o material será visível para todos (Global).</p>
                            </div>
                            <div className="mb-4"><label className="block text-sm font-bold mb-2 dark:text-zinc-300">Conteúdo</label><RichTextEditor value={newMatContent} onChange={setNewMatContent} /></div>
                            <div className="flex gap-2">
                                <button onClick={handleSaveMaterial} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">{editingMaterialId ? 'Salvar Alterações' : 'Adicionar'}</button>
                                {editingMaterialId && <button onClick={handleCancelMaterialEdit} className="bg-zinc-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-zinc-700">Cancelar</button>}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                             <h3 className="text-xl font-bold dark:text-white mb-4">Materiais Existentes (Organizado por Pastas)</h3>
                             <div className="space-y-4">
                                {sortedSubjects.map(subject => {
                                    const isExpanded = expandedSubjects.includes(subject);
                                    const subjectMats = materialsBySubject[subject].sort((a, b) => (a.order || 0) - (b.order || 0));
                                    
                                    return (
                                        <div key={subject} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
                                            <div className="p-4 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 transition cursor-pointer select-none" onClick={() => toggleSubjectExpand(subject)}>
                                                <div className="flex items-center gap-3">
                                                    {getSubjectIcon(subject, "text-red-600", 24)}
                                                    <span className="font-bold text-lg dark:text-white">{subject}</span>
                                                    <span className="text-xs bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">{subjectMats.length} itens</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden md:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1">Visibilidade:</span>
                                                        {plans.map(plan => {
                                                            const allHavePlan = subjectMats.every(m => (m.allowedPlanIds || []).includes(plan.id));
                                                            const someHavePlan = subjectMats.some(m => (m.allowedPlanIds || []).includes(plan.id));
                                                            return (
                                                                <button
                                                                    key={plan.id}
                                                                    onClick={() => handleSubjectVisibilityChange(subject, plan.id, !allHavePlan)}
                                                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                                                                        allHavePlan 
                                                                            ? 'bg-blue-600 text-white border-blue-600' 
                                                                            : someHavePlan
                                                                                ? 'bg-blue-900/30 text-blue-300 border-blue-800'
                                                                                : 'border-zinc-600 text-zinc-500 hover:border-zinc-400'
                                                                    }`}
                                                                    title={`Aplicar plano ${plan.name} a todos os materiais desta pasta`}
                                                                >
                                                                    {plan.name}
                                                                </button>
                                                            );
                                                        })}
                                                        {plans.length === 0 && <span className="text-xs text-zinc-500 italic">Crie planos para restringir.</span>}
                                                    </div>
                                                    {isExpanded ? <ChevronDown size={20} className="text-zinc-400"/> : <ChevronRight size={20} className="text-zinc-400"/>}
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="p-2 space-y-1 bg-white dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-700">
                                                    <div className="md:hidden p-2 mb-2 border-b border-zinc-700 flex flex-wrap gap-2">
                                                        <span className="w-full text-xs font-bold text-zinc-500 uppercase">Aplicar a todos:</span>
                                                        {plans.map(plan => {
                                                            const allHavePlan = subjectMats.every(m => (m.allowedPlanIds || []).includes(plan.id));
                                                            return (
                                                                <button key={plan.id} onClick={() => handleSubjectVisibilityChange(subject, plan.id, !allHavePlan)} className={`px-2 py-1 rounded text-xs border ${allHavePlan ? 'bg-blue-600 text-white' : 'border-zinc-600 text-zinc-400'}`}>{plan.name}</button>
                                                            )
                                                        })}
                                                    </div>
                                                    {subjectMats.map(m => (
                                                        <div key={m.id} className={`flex justify-between items-center p-3 border rounded-lg ml-4 ${editingMaterialId === m.id ? 'border-blue-500 bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm dark:text-white">{m.title}</span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">{m.category === 'GUIDED' ? 'Guiado' : 'Lei Seca'}</span>
                                                                </div>
                                                                <p className="text-xs text-zinc-500 mt-0.5">{m.topic || 'Geral'}</p>
                                                                <div className="flex gap-1 mt-1">
                                                                    {(m.allowedPlanIds && m.allowedPlanIds.length > 0) ? 
                                                                        m.allowedPlanIds.map(pid => {
                                                                            const pName = plans.find(p => p.id === pid)?.name;
                                                                            if(!pName) return null;
                                                                            return <span key={pid} className="text-[9px] bg-blue-900/20 text-blue-400 px-1 rounded border border-blue-900/30">{pName}</span>
                                                                        }) 
                                                                        : <span className="text-[9px] bg-green-900/20 text-green-400 px-1 rounded border border-green-900/30">Global</span>
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 items-center">
                                                                <button onClick={() => handleMoveMaterial(m, 'up')} className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-700 rounded" title="Subir"><ArrowUp size={14}/></button>
                                                                <button onClick={() => handleMoveMaterial(m, 'down')} className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-700 rounded" title="Descer"><ArrowDown size={14}/></button>
                                                                <button onClick={() => handleEditMaterial(m)} className="text-blue-500 hover:bg-blue-900/20 p-1.5 rounded ml-1"><Edit3 size={16}/></button>
                                                                <button onClick={(e) => handleDeleteMaterial(e, m.id)} className="text-red-500 hover:bg-red-900/20 p-1.5 rounded"><Trash2 size={16}/></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {sortedSubjects.length === 0 && <p className="text-center text-zinc-500 italic py-10">Nenhum material cadastrado.</p>}
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'users' && (
                    <div className="space-y-8">
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold dark:text-white mb-4">Cadastrar Novo Aluno (Direto)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <input type="text" placeholder="Nome Completo" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="email" placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <input type="text" placeholder="Senha Inicial" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white" />
                                <select value={newUserPlan} onChange={e => setNewUserPlan(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 rounded text-zinc-800 dark:text-white">
                                    <option value="">Plano (Padrão/Global)</option>
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg">Cadastrar Aluno</button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">Solicitações Pendentes {pendingUsers.length > 0 && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{pendingUsers.length}</span>}</h3>
                            <div className="space-y-2">
                                {pendingUsers.length > 0 ? pendingUsers.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
                                        <div><p className="font-bold dark:text-white">{u.name}</p><p className="text-xs text-zinc-400">{u.email}</p><p className="text-[10px] text-red-400 font-bold uppercase mt-1">Aguardando Aprovação</p></div>
                                        <div className="flex gap-2 items-center">
                                            <select className="bg-zinc-800 text-white text-xs border border-zinc-600 rounded p-1" onChange={(e) => handleApproveUser(u.id, e.target.value)} defaultValue="">
                                                 <option value="" disabled>Aprovar c/ Plano...</option>
                                                 {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                 <option value="none">Sem Plano (Global)</option>
                                            </select>
                                            <button onClick={() => handleRejectUser(u.id)} className="flex items-center gap-1 bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded border border-red-800 text-xs font-bold transition"><XCircle size={14}/> Rejeitar</button>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-500 text-sm italic">Nenhuma solicitação pendente.</p>}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                             <h3 className="text-xl font-bold dark:text-white mb-4">Alunos Ativos</h3>
                             <div className="space-y-2">
                                {activeUsers.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-3 border border-zinc-700 rounded bg-zinc-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">{u.name.charAt(0)}</div>
                                            <div>
                                                <p className="text-white font-bold">{u.name}</p>
                                                <div className="text-xs text-zinc-400 flex items-center gap-2">
                                                    <span>{u.email}</span>
                                                    <span className="text-zinc-600">•</span>
                                                    <select 
                                                        value={u.planId || ""} 
                                                        onChange={(e) => handleChangeUserPlan(u.id, e.target.value)}
                                                        className="bg-zinc-900 border border-zinc-700 text-blue-400 rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">Global (Sem Plano)</option>
                                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRejectUser(u.id)} className="text-zinc-500 hover:text-red-500 p-2" title="Remover Aluno"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const stored = localStorage.getItem('current_user');
            if (stored) {
                try {
                    const u = JSON.parse(stored);
                    const { data, error } = await supabase.from('users').select('id, approved, role').eq('id', u.id).single();
                    
                    if (error || !data) {
                        localStorage.removeItem('current_user');
                        setUser(null);
                    } else if (data.role === 'STUDENT' && !data.approved) {
                        localStorage.removeItem('current_user');
                        setUser(null);
                        alert("Acesso revogado ou pendente de aprovação.");
                    } else {
                        setUser(u);
                    }
                } catch (e) {
                    console.error("Erro ao validar sessão:", e);
                    localStorage.removeItem('current_user');
                    setUser(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
            
            checkDailyReset();
        };

        validateSession();
    }, []);

    const handleLogin = (u: User) => {
        setUser(u);
        localStorage.setItem('current_user', JSON.stringify(u));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('current_user');
    };

    const handleUpdateProfile = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        globalRepo.saveUser(updatedUser);
    };

    if (isLoading) {
        return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold animate-pulse">Carregando sistema...</div>;
    }

    if (!user) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    if (user.role === UserRole.ADMIN) {
        return <AdminDashboard user={user} onLogout={handleLogout} />;
    }

    return <StudentDashboard user={user} onLogout={handleLogout} updateProfile={handleUpdateProfile} />;
};

export default App;