
import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit3, Save, X, List, AlertCircle } from 'lucide-react';
import { FlashcardService } from './service';
import { FlashcardDeck } from './types';

export const AdminFlashcardPanel = ({ user }: { user: any }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [view, setView] = useState<'LIST' | 'EDIT_DECK'>('LIST');
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  
  // Card Edit State
  const [cards, setCards] = useState<any[]>([]);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // New Deck State
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const d = await FlashcardService.getOfficialDecks();
    setDecks(d);
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle) return;
    await FlashcardService.createDeck(user.id, newDeckTitle, newDeckDesc, true);
    setIsCreating(false);
    setNewDeckTitle('');
    setNewDeckDesc('');
    loadData();
  };

  const handleDeleteDeck = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Excluir este deck removerá o acesso de todos os alunos que ainda não o baixaram. Confirmar?")) return;
    await FlashcardService.deleteDeck(id);
    loadData();
  };

  const handleEditDeck = async (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    const c = await FlashcardService.getCards(deck.id);
    setCards(c);
    setView('EDIT_DECK');
  };

  const handleAddCard = async () => {
    if (!editingDeck || !newFront || !newBack) return;
    await FlashcardService.createCard(editingDeck.id, newFront, newBack);
    const c = await FlashcardService.getCards(editingDeck.id);
    setCards(c);
    setNewFront('');
    setNewBack('');
  };

  const handleDeleteCard = async (id: string) => {
    if (!editingDeck) return;
    await FlashcardService.deleteCard(id);
    const c = await FlashcardService.getCards(editingDeck.id);
    setCards(c);
  };

  if (view === 'EDIT_DECK' && editingDeck) {
    return (
      <div className="bg-[#09090b] min-h-screen p-8 text-zinc-200">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Edit3 size={24} className="text-blue-500"/> Editando Oficial: {editingDeck.title}
            </h2>
            <p className="text-zinc-500 text-xs mt-1">Todas as cartas adicionadas aqui estarão disponíveis para download pelos alunos.</p>
          </div>
          <button onClick={() => setView('LIST')} className="text-zinc-400 hover:text-white font-bold bg-zinc-900 px-4 py-2 rounded border border-zinc-800 text-sm">Voltar</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Card Form */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl h-fit">
            <h3 className="text-white font-bold uppercase text-sm mb-4">Adicionar Carta Oficial</h3>
            <div className="space-y-4">
              <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Frente (Pergunta)" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white h-24 text-sm resize-none focus:border-blue-500 outline-none"/>
              <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Verso (Resposta)" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white h-24 text-sm resize-none focus:border-blue-500 outline-none"/>
              <button onClick={handleAddCard} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded flex items-center justify-center gap-2 uppercase text-xs tracking-wider"><Plus size={16}/> Adicionar</button>
            </div>
          </div>

          {/* Cards List */}
          <div className="lg:col-span-2 space-y-3">
            {cards.length === 0 && (
                <div className="text-center text-zinc-500 italic py-10 border-2 border-dashed border-zinc-800 rounded-xl">
                    <AlertCircle className="mx-auto mb-2 opacity-50"/>
                    Nenhuma carta cadastrada neste baralho.
                </div>
            )}
            {cards.map(card => (
              <div key={card.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex justify-between group hover:border-zinc-700 transition">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div><span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Frente</span><p className="text-zinc-200 text-sm mt-1">{card.front}</p></div>
                  <div className="md:border-l md:border-zinc-800 md:pl-4"><span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Verso</span><p className="text-zinc-400 text-sm mt-1">{card.back}</p></div>
                </div>
                <button onClick={() => handleDeleteCard(card.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#09090b] min-h-screen p-8 text-zinc-200">
      <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Layers className="text-blue-500" size={32}/> Admin Flashcards
          </h1>
          <p className="text-zinc-500 text-sm">Gerencie os baralhos oficiais (templates) da plataforma.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg uppercase text-sm tracking-wide">
          <Plus size={18}/> Novo Deck Oficial
        </button>
      </header>

      {isCreating && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mb-8 animate-fade-in max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold uppercase text-sm">Criar Baralho Oficial</h3>
            <button onClick={() => setIsCreating(false)}><X className="text-zinc-500 hover:text-white"/></button>
          </div>
          <div className="space-y-4">
            <input value={newDeckTitle} onChange={e => setNewDeckTitle(e.target.value)} placeholder="Título (ex: Direito Constitucional - Art 5º)" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-blue-500"/>
            <input value={newDeckDesc} onChange={e => setNewDeckDesc(e.target.value)} placeholder="Descrição breve para o aluno..." className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white outline-none focus:border-blue-500"/>
            <button onClick={handleCreateDeck} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 w-full uppercase text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map(deck => (
          <div key={deck.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-blue-600 transition group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-white font-bold text-lg leading-tight">{deck.title}</h3>
              <span className="text-[10px] bg-yellow-600/20 text-yellow-500 px-2 py-1 rounded border border-yellow-600/30 uppercase font-bold">Oficial</span>
            </div>
            <p className="text-zinc-400 text-xs mb-6 h-10 line-clamp-2">{deck.description || "Sem descrição."}</p>
            <div className="flex gap-2 border-t border-zinc-800 pt-4 mt-auto">
              <button onClick={() => handleEditDeck(deck)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2 uppercase"><List size={14}/> Gerenciar ({deck.card_count})</button>
              <button onClick={() => handleDeleteDeck(deck.id)} className="px-3 bg-zinc-800 hover:bg-red-900/30 hover:text-red-500 rounded text-zinc-500 transition"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {decks.length === 0 && <p className="col-span-full text-center text-zinc-500 italic py-10">Nenhum baralho oficial criado.</p>}
      </div>
    </div>
  );
};
