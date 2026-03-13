import React, { useState } from 'react';
import { Zap, Save, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionBankService } from './service';
import { QBQuestion, QuestionType, Difficulty } from './types';

const API_KEY = process.env.API_KEY || '';

export const AIGenerateQuestions = () => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Generate ${count} multiple choice questions about ${topic} with difficulty ${difficulty}. Return as JSON array of objects with keys: statement, alternatives [{label, text, is_correct}], justification.`,
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
      setGeneratedQuestions(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar questões.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    for (const q of generatedQuestions) {
      await QuestionBankService.createQuestion({
        ...q,
        type: 'ABCDE',
        board: 'IA',
        organ: 'IA',
        role: 'IA',
        discipline: topic,
        subject: topic,
        difficulty,
        year: new Date().getFullYear(),
      });
    }
    alert('Questões salvas!');
    setGeneratedQuestions([]);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
        <Zap className="text-yellow-500" size={16}/> Geração de Questões via IA
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Assunto" className="bg-zinc-950 border border-zinc-800 rounded p-2 text-white" />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="bg-zinc-950 border border-zinc-800 rounded p-2 text-white">
            <option value="EASY">Fácil</option>
            <option value="MEDIUM">Médio</option>
            <option value="HARD">Difícil</option>
        </select>
        <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} className="bg-zinc-950 border border-zinc-800 rounded p-2 text-white" />
      </div>
      <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Gerando...' : 'Gerar Questões'}
      </button>

      {generatedQuestions.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-white font-bold">Revisão:</h4>
          {generatedQuestions.map((q, i) => (
            <div key={i} className="bg-zinc-800 p-4 rounded border border-zinc-700 text-sm">
              <p className="text-white mb-2">{q.statement}</p>
              <ul className="text-zinc-400">
                {q.alternatives.map((a: any, j: number) => <li key={j} className={a.is_correct ? 'text-green-500' : ''}>{a.label}: {a.text}</li>)}
              </ul>
            </div>
          ))}
          <button onClick={handleSaveAll} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">
            Salvar Todas
          </button>
        </div>
      )}
    </div>
  );
};
