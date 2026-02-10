import { User, UserRole, ScheduleItem, Subject, DailyGoal, RevisionItem, Simulado, SimuladoResult, Material, StudySession, Edital, EditalSubject } from '../types';

// Mock Data Initialization
const INITIAL_SUBJECTS: Subject[] = [
  { id: '1', name: 'Português', totalHoursStudied: 0 },
  { id: '2', name: 'Matemática/Raciocínio Lógico', totalHoursStudied: 0 },
  { id: '3', name: 'Informática', totalHoursStudied: 0 },
  { id: '4', name: 'Direito Constitucional', totalHoursStudied: 0 },
  { id: '5', name: 'Direito Administrativo', totalHoursStudied: 0 },
  { id: '6', name: 'Direitos Humanos', totalHoursStudied: 0 },
  { id: '7', name: 'Direito Penal', totalHoursStudied: 0 },
  { id: '8', name: 'Processo Penal', totalHoursStudied: 0 },
  { id: '9', name: 'Legislação Extravagante', totalHoursStudied: 0 },
  { id: '10', name: 'Redação', totalHoursStudied: 0 },
  { id: '11', name: 'Resolução de Questões', totalHoursStudied: 0 },
  { id: '12', name: 'Simulado', totalHoursStudied: 0 },
];

const INITIAL_SCHEDULE: ScheduleItem[] = [
  { day: 'Segunda', subjects: [] },
  { day: 'Terça', subjects: [] },
  { day: 'Quarta', subjects: [] },
  { day: 'Quinta', subjects: [] },
  { day: 'Sexta', subjects: [] },
  { day: 'Sábado', subjects: [] },
  { day: 'Domingo', subjects: [] },
];

const INITIAL_MATERIALS: Material[] = [
  {
    id: 'm1',
    title: 'Resumo de Crase',
    subject: 'Português',
    topic: 'Crase',
    category: 'GUIDED',
    contentHtml: '<h3>Regra Geral</h3><p>Haverá crase sempre que o termo regente exigir a preposição "a" e o termo regido admitir o artigo "a".</p><ul><li>Vou à praia (Vou A + A praia)</li></ul>',
    dateAdded: new Date().toISOString()
  },
  {
    id: 'm2',
    title: 'Artigo 5º da CF/88 Comentado',
    subject: 'Direito Constitucional',
    topic: 'Direitos Fundamentais',
    category: 'LEI_SECA',
    contentHtml: '<p><strong>Todos são iguais perante a lei...</strong></p><p>Este é o princípio da isonomia.</p>',
    dateAdded: new Date().toISOString()
  },
  {
    id: 'm3',
    title: 'Inquérito Policial - Características',
    subject: 'Processo Penal',
    topic: 'Inquérito',
    category: 'GUIDED',
    contentHtml: '<p>O IP é um procedimento administrativo, inquisitivo, dispensável...</p>',
    dateAdded: new Date().toISOString()
  }
];

const INITIAL_SIMULADOS: Simulado[] = [
  {
    id: 's1',
    title: 'Simulado 01 - Soldado PM',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Dummy PDF
    answerKey: '1A,2B,3C,4D,5E',
    questionCount: 5,
    type: 'ABCDE',
    instructions: 'Simulado focado em Português e Matemática. Tempo estimado: 20 min.',
    mode: 'PDF'
  },
  {
    id: 's2',
    title: 'Simulado 02 - Direito Geral',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    answerKey: '1C,2C,3E,4E,5C',
    questionCount: 5,
    type: 'CERTO_ERRADO',
    instructions: 'Estilo CESPE/CEBRASPE. Uma errada anula uma certa.',
    mode: 'PDF'
  }
];

const INITIAL_EDITAL: Edital[] = [
  {
    id: 'edital_padrao',
    title: 'Edital Verticalizado PM',
    subjects: [
      {
        id: 'sub_pt',
        name: 'Língua Portuguesa',
        topics: [
          { id: 't1', name: 'Interpretação de Texto' },
          { id: 't2', name: 'Ortografia Oficial' },
          { id: 't3', name: 'Crase' },
          { id: 't4', name: 'Sintaxe' }
        ]
      },
      {
        id: 'sub_dir',
        name: 'Direito Constitucional',
        topics: [
          { id: 't5', name: 'Artigo 5º - Direitos e Deveres' },
          { id: 't6', name: 'Segurança Pública (Art. 144)' }
        ]
      }
    ]
  }
];

export const getStorage = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    if (key === 'subjects') return INITIAL_SUBJECTS as unknown as T;
    if (key === 'materials_global') return INITIAL_MATERIALS as unknown as T;
    if (key === 'simulados_content') return INITIAL_SIMULADOS as unknown as T;
    if (key === 'all_editais') return INITIAL_EDITAL as unknown as T;
  }
  
  return stored ? JSON.parse(stored) : defaultValue;
};

export const setStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Check and reset daily goals
export const checkDailyReset = () => {
  const lastLogin = localStorage.getItem('last_login_date');
  const today = new Date().toDateString();

  if (lastLogin !== today) {
    // Reset goals
    setStorage('daily_goals', []);
    localStorage.setItem('last_login_date', today);
  }
};