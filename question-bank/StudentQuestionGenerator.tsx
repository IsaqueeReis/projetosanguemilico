import React, { useState } from 'react';
import { Play, Loader2, PlusCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionBankService } from './service';
import { Difficulty, QuestionType } from './types';

const API_KEY = process.env.API_KEY || '';

interface Props {
  onQuestionsGenerated: () => void;
}

export const StudentQuestionGenerator = ({ onQuestionsGenerated }: Props) => {
  const [board, setBoard] = useState('');
  const [type, setType] = useState<QuestionType>('ABCDE');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [discipline, setDiscipline] = useState('');
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!board || !discipline || !subject) {
      alert('Por favor, preencha Banca, Matéria e Assunto.');
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      let typeDescription = '';
      if (type === 'CERTO_ERRADO') typeDescription = 'Certo ou Errado (2 alternativas)';
      else if (type === 'ABCD') typeDescription = 'Múltipla escolha com 4 alternativas (A, B, C, D)';
      else typeDescription = 'Múltipla escolha com 5 alternativas (A, B, C, D, E)';

      const prompt = `Crie ${count} questões inéditas para concurso público.
Banca: ${board}
Matéria: ${discipline}
Assunto: ${subject}
Dificuldade: ${difficulty === 'EASY' ? 'Fácil' : difficulty === 'MEDIUM' ? 'Média' : 'Difícil'}
Modalidade: ${typeDescription}

Retorne um array JSON de objetos com as seguintes chaves:
- statement: O enunciado da questão.
- alternatives: Array de objetos com { label (A, B, C, etc ou C, E), text (texto da alternativa), is_correct (boolean) }. Apenas UMA alternativa deve ser true.
- justification: A justificativa detalhada da resposta correta.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                statement: { type: Type.STRING },
                alternatives: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING },
                      is_correct: { type: Type.BOOLEAN }
                    }
                  }
                },
                justification: { type: Type.STRING }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      
      // Save to database
      for (const q of data) {
        await QuestionBankService.createQuestion({
          ...q,
          type,
          board,
          discipline,
          subject,
          difficulty,
          year: new Date().getFullYear(),
          organ: 'Inédita',
          role: 'Geral',
        });
      }
      
      alert(`${data.length} questões geradas com sucesso!`);
      onQuestionsGenerated();
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar questões. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
        <PlusCircle className="text-red-500" size={16}/> Gerar Questões Inéditas
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Banca</label>
          <input 
            value={board} 
            onChange={e => setBoard(e.target.value)} 
            placeholder="Ex: Cebraspe, FCC, FGV" 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600" 
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Modalidade</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value as QuestionType)} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600"
          >
            <option value="CERTO_ERRADO">Certo / Errado</option>
            <option value="ABCD">Múltipla Escolha (4 Alt)</option>
            <option value="ABCDE">Múltipla Escolha (5 Alt)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Dificuldade</label>
          <select 
            value={difficulty} 
            onChange={e => setDifficulty(e.target.value as Difficulty)} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600"
          >
            <option value="EASY">Fácil</option>
            <option value="MEDIUM">Média</option>
            <option value="HARD">Difícil</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Matéria</label>
          <input 
            value={discipline} 
            onChange={e => setDiscipline(e.target.value)} 
            placeholder="Ex: Direito Constitucional" 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600" 
          />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Assunto</label>
          <input 
            value={subject} 
            onChange={e => setSubject(e.target.value)} 
            placeholder="Ex: Direitos e Garantias Fundamentais" 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600" 
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Quantidade</label>
          <select 
            value={count} 
            onChange={e => setCount(Number(e.target.value))} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white outline-none focus:border-red-600"
          >
            <option value={5}>5 Questões</option>
            <option value={10}>10 Questões</option>
            <option value={15}>15 Questões</option>
          </select>
        </div>
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading} 
        className="w-full md:w-auto bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Gerando Questões...
          </>
        ) : (
          <>
            <Play size={20} />
            Gerar e Iniciar
          </>
        )}
      </button>
    </div>
  );
};
