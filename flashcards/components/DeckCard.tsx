
import React from 'react';
import { Play, Trash2, Copy, Layers, Edit3 } from 'lucide-react';
import { FlashcardDeck } from '../types';

interface Props {
  deck: FlashcardDeck;
  onStudy: (deck: FlashcardDeck) => void;
  onEdit?: (deck: FlashcardDeck) => void;
  onDelete?: (id: string) => void;
  onImport?: (id: string) => void;
  isOwner: boolean;
}

export const DeckCard: React.FC<Props> = ({ deck, onStudy, onEdit, onDelete, onImport, isOwner }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition group relative flex flex-col h-full">
      {deck.is_official && (
        <div className="absolute top-0 right-0 bg-yellow-600 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wide z-10">
          Oficial
        </div>
      )}
      
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-red-600 transition">
          <Layers size={24} />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{deck.title}</h3>
          <p className="text-zinc-500 text-xs mt-1 font-medium uppercase tracking-wide">{deck.card_count || 0} Cartas</p>
        </div>
      </div>
      
      <p className="text-zinc-400 text-xs mb-6 line-clamp-3 flex-1">
        {deck.description || "Sem descrição tática."}
      </p>

      <div className="flex gap-2 mt-auto">
        {isOwner ? (
          <>
            <button 
              onClick={() => onStudy(deck)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wide transition shadow-lg shadow-green-900/20"
            >
              <Play size={14}/> Estudar
            </button>
            <button 
              onClick={() => onEdit && onEdit(deck)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition"
              title="Editar / Adicionar Cartas"
            >
              <Edit3 size={16}/>
            </button>
            <button 
              onClick={() => onDelete && onDelete(deck.id)}
              className="px-3 py-2 bg-zinc-800 hover:bg-red-900/50 hover:text-red-500 rounded-lg text-zinc-500 transition"
              title="Excluir Deck"
            >
              <Trash2 size={16}/>
            </button>
          </>
        ) : (
          <button 
            onClick={() => onImport && onImport(deck.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wide transition shadow-lg shadow-blue-900/20"
          >
            <Copy size={14}/> Baixar Deck
          </button>
        )}
      </div>
    </div>
  );
};
