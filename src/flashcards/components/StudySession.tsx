
import React, { useState, useEffect } from 'react';
import { Flashcard, FlashcardDeck } from '../types';
import { FlashcardService } from '../service';
import { Check, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  deck: FlashcardDeck;
  userId: string;
  onExit: () => void;
}

export const StudySession: React.FC<Props> = ({ deck, userId, onExit }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const due = await FlashcardService.getCardsDue(userId, deck.id);
        setCards(due.sort(() => Math.random() - 0.5)); // Shuffle
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deck.id, userId]);

  const handleRate = async (quality: number) => {
    const currentCard = cards[currentIndex];
    
    // Optimistic Update UI
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
    }

    // Async Save
    await FlashcardService.submitReview(userId, currentCard.id, quality);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-pulse">
        <RefreshCw size={32} className="text-red-600 animate-spin mb-4"/>
        <p className="text-zinc-500 font-bold uppercase tracking-widest">Carregando Munição...</p>
    </div>
  );

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
        <Check size={40} className="text-green-500"/>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Área Limpa!</h2>
      <p className="text-zinc-500 mb-6 max-w-md">Você revisou todas as cartas pendentes deste baralho por hoje. Bom descanso, soldado.</p>
      <button onClick={onExit} className="text-zinc-300 hover:text-white underline text-sm uppercase font-bold tracking-wide">Retornar à Base</button>
    </div>
  );

  if (finished) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Missão Cumprida</h2>
      <p className="text-zinc-500 mb-8">Sessão de estudos finalizada com sucesso.</p>
      <button onClick={onExit} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest shadow-lg shadow-red-900/20">Retornar</button>
    </div>
  );

  const currentCard = cards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-150px)] flex flex-col p-4">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onExit} className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><ArrowLeft size={16}/> Abortar Missão</button>
        <span className="text-zinc-500 font-mono text-xs font-bold bg-zinc-900 px-3 py-1 rounded border border-zinc-800">{currentIndex + 1} / {cards.length}</span>
      </div>

      <div className="flex-1 perspective-1000 relative mb-6 group">
        <div 
            className={`w-full h-full relative preserve-3d transition-all duration-500 cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => !isFlipped && setIsFlipped(true)}
        >
            {/* FRONT */}
            <div className="absolute inset-0 backface-hidden bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl group-hover:border-zinc-700 transition-colors">
                <span className="absolute top-6 left-6 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Pergunta</span>
                <p className="text-2xl font-bold text-white leading-relaxed">{currentCard.front}</p>
                <p className="absolute bottom-8 text-zinc-600 text-xs animate-pulse font-mono uppercase">Toque para revelar</p>
            </div>

            {/* BACK */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-zinc-800 border-2 border-red-900/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="absolute top-6 left-6 text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">Resposta</span>
                <p className="text-xl text-zinc-200 leading-relaxed">{currentCard.back}</p>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="h-20">
        {isFlipped ? (
            <div className="grid grid-cols-4 gap-3 h-full">
                <button onClick={() => handleRate(0)} className="bg-red-950/50 border border-red-900 text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-900 hover:text-white transition-all">Errei<br/><span className="text-[9px] opacity-60">Reset</span></button>
                <button onClick={() => handleRate(1)} className="bg-orange-950/50 border border-orange-900 text-orange-500 rounded-xl font-bold text-xs uppercase hover:bg-orange-900 hover:text-white transition-all">Difícil<br/><span className="text-[9px] opacity-60">Curto</span></button>
                <button onClick={() => handleRate(2)} className="bg-blue-950/50 border border-blue-900 text-blue-500 rounded-xl font-bold text-xs uppercase hover:bg-blue-900 hover:text-white transition-all">Bom<br/><span className="text-[9px] opacity-60">Médio</span></button>
                <button onClick={() => handleRate(3)} className="bg-green-950/50 border border-green-900 text-green-500 rounded-xl font-bold text-xs uppercase hover:bg-green-900 hover:text-white transition-all">Fácil<br/><span className="text-[9px] opacity-60">Longo</span></button>
            </div>
        ) : (
            <button 
                onClick={() => setIsFlipped(true)}
                className="w-full h-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-sm uppercase tracking-widest border border-zinc-700 transition-all shadow-lg"
            >
                Mostrar Resposta
            </button>
        )}
      </div>
    </div>
  );
};
