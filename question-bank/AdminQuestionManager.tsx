
import React, { useState, useEffect } from 'react';
import { AIQuestionImport } from './AIQuestionImport';
import { QuestionBankService } from './service';
import { QBQuestion, QuestionType, Difficulty } from './types';
import { AIQuestionExtraction } from '../essay-module/types';
import { Save } from 'lucide-react';

export const AdminQuestionManager = () => {
  const [statement, setStatement] = useState('');
  const [board, setBoard] = useState('');
  const [organ, setOrgan] = useState('');
  const [role, setRole] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [subject, setSubject] = useState('');
  const [subSubject, setSubSubject] = useState('');
  const [source, setSource] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [type, setType] = useState<QuestionType>('ABCDE');
  const [alternatives, setAlternatives] = useState<{label: string, text: string, is_correct: boolean}[]>([]);
  const [justification, setJustification] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Efeito para ajustar automaticamente as alternativas quando o TIPO muda
  useEffect(() => {
    let newAlts: {label: string, text: string, is_correct: boolean}[] = [];
    
    if (type === 'CERTO_ERRADO') {
        newAlts = [
            { label: 'C', text: 'Certo', is_correct: false },
            { label: 'E', text: 'Errado', is_correct: false }
        ];
    } else if (type === 'ABCD') {
        newAlts = ['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '', is_correct: false }));
    } else {
        newAlts = ['A', 'B', 'C', 'D', 'E'].map(l => ({ label: l, text: '', is_correct: false }));
    }
    
    setAlternatives(newAlts);
  }, [type]);

  const handleAIComplete = (data: AIQuestionExtraction) => {
    setStatement(data.statement);
    if (data.subject_suggestion) setDiscipline(data.subject_suggestion);
    if (data.board_suggestion) setBoard(data.board_suggestion);
    
    // Auto-detect type
    const altCount = data.alternatives.length;
    if (altCount === 2) setType('CERTO_ERRADO');
    else if (altCount === 4) setType('ABCD');
    else setType('ABCDE');

    setAlternatives(data.alternatives);
  };

  const handleSave = async () => {
    if (!statement || !discipline || !board) return alert("Preencha Enunciado, Banca e Disciplina.");
    if (alternatives.filter(a => a.is_correct).length !== 1) return alert("Marque exatamente uma alternativa correta.");

    setIsSaving(true);
    try {
        await QuestionBankService.createQuestion({
            statement,
            type,
            board,
            organ,
            role,
            discipline,
            subject: subject || discipline,
            sub_subject: subSubject,
            source,
            year,
            difficulty,
            justification,
            alternatives
        });
        
        alert("Questão salva no Banco de Dados com sucesso!");
        
        // Reset parcial para facilitar cadastros sequenciais
        setStatement('');
        // Reseta alternativas com base no tipo atual
        if (type === 'CERTO_ERRADO') {
             setAlternatives([{ label: 'C', text: 'Certo', is_correct: false }, { label: 'E', text: 'Errado', is_correct: false }]);
        } else if (type === 'ABCD') {
             setAlternatives(['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '', is_correct: false })));
        } else {
             setAlternatives(['A', 'B', 'C', 'D', 'E'].map(l => ({ label: l, text: '', is_correct: false })));
        }
        setJustification('');
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar questão. Verifique o console.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900">
      <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Gestão de Questões</h2>
      
      {/* Módulo IA */}
      <AIQuestionImport onExtractionComplete={handleAIComplete} />

      {/* Formulário Principal */}
      <div className="space-y-4 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Enunciado</label>
            <textarea 
                value={statement} 
                onChange={e => setStatement(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white h-32 mt-1 focus:border-red-600 outline-none"
            />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Banca</label>
                <input value={board} onChange={e => setBoard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Órgão</label>
                <input value={organ} onChange={e => setOrgan(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Cargo</label>
                <input value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Ano</label>
                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Disciplina</label>
                <input value={discipline} onChange={e => setDiscipline(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Assunto</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Subassunto</label>
                <input value={subSubject} onChange={e => setSubSubject(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
             <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Fonte</label>
                <input value={source} onChange={e => setSource(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1"/>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Dificuldade</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1">
                    <option value="EASY">Fácil</option>
                    <option value="MEDIUM">Médio</option>
                    <option value="HARD">Difícil</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value as QuestionType)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1">
                    <option value="ABCDE">ABCDE</option>
                    <option value="ABCD">ABCD</option>
                    <option value="CERTO_ERRADO">Certo/Errado</option>
                </select>
            </div>
        </div>

        {/* Alternativas Editor */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase block">Alternativas (Estrutura Fixa)</label>
            {alternatives.map((alt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    <span className="font-bold w-6 text-center">{alt.label}</span>
                    <input 
                        value={alt.text} 
                        onChange={e => {
                            const newAlts = [...alternatives];
                            newAlts[idx].text = e.target.value;
                            setAlternatives(newAlts);
                        }}
                        readOnly={type === 'CERTO_ERRADO'} // Texto fixo para C/E
                        className={`flex-1 bg-zinc-950 border rounded p-2 text-white ${alt.is_correct ? 'border-green-600' : 'border-zinc-800'} ${type === 'CERTO_ERRADO' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button 
                        onClick={() => {
                            const newAlts = alternatives.map((a, i) => ({...a, is_correct: i === idx}));
                            setAlternatives(newAlts);
                        }}
                        className={`w-8 h-8 rounded flex items-center justify-center border ${alt.is_correct ? 'bg-green-600 border-green-600 text-white' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                        title="Marcar como correta"
                    >
                        ✓
                    </button>
                </div>
            ))}
        </div>

        {/* Justificativa / Resolução */}
        <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Justificativa / Comentário do Professor</label>
            <textarea 
                value={justification} 
                onChange={e => setJustification(e.target.value)}
                placeholder="Explique por que o gabarito é este..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white h-24 mt-1 focus:border-red-600 outline-none"
            />
        </div>

        <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
            <Save size={18}/> {isSaving ? 'Salvando...' : 'Salvar Questão'}
        </button>
      </div>
    </div>
  );
};
