
import React, { useState, useEffect } from 'react';
import { Layers, Plus, BookOpen, X, AlertCircle } from 'lucide-react';
import { FlashcardDeck } from './types';
import { FlashcardService } from './service';
import { DeckCard } from './components/DeckCard';
import { StudySession } from './components/StudySession';

export const FlashcardPanel = ({ studentId }: { studentId: string }) => {
  const [view, setView] = useState<'LIST' | 'STUDY' | 'MANAGE_CARDS'>('LIST');
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  
  const [myDecks, setMyDecks] = useState<FlashcardDeck[]>([]);
  const [officialDecks, setOfficialDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create Deck State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');

  // Manage Cards State
  const [cards, setCards] = useState<any[]>([]);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    const my = await FlashcardService.getMyDecks(studentId);
    const official = await FlashcardService.getOfficialDecks();
    setMyDecks(my);
    setOfficialDecks(official);
    setLoading(false);
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle) return;
    await FlashcardService.createDeck(studentId, newDeckTitle, newDeckDesc);
    setShowCreateModal(false);
    setNewDeckTitle('');
    setNewDeckDesc('');
    loadDecks();
  };

  const handleDeleteDeck = async (id: string) => {
    if (!window.confirm("Confirmar exclusão? Todo o progresso deste baralho será perdido.")) return;
    await FlashcardService.deleteDeck(id);
    loadDecks();
  };

  const handleImportDeck = async (id: string) => {
    if (!window.confirm("Baixar este baralho para sua conta?")) return;
    try {
        await FlashcardService.importDeck(studentId, id);
        alert("Baralho importado! Agora ele aparece em 'Meus Baralhos'.");
        loadDecks();
    } catch (e: any) {
        alert("Erro ao importar: " + e.message);
    }
  };

  const startStudy = (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setView('STUDY');
  };

  const openManageCards = async (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    const c = await FlashcardService.getCards(deck.id);
    setCards(c);
    setView('MANAGE_CARDS');
  };

  const handleAddCard = async () => {
    if (!activeDeck || !newFront || !newBack) return;
    await FlashcardService.createCard(activeDeck.id, newFront, newBack);
    const c = await FlashcardService.getCards(activeDeck.id);
    setCards(c);
    setNewFront('');
    setNewBack('');
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!activeDeck) return;
    await FlashcardService.deleteCard(cardId);
    const c = await FlashcardService.getCards(activeDeck.id);
    setCards(c);
  };

  // --- RENDER VIEWS ---

  if (view === 'STUDY' && activeDeck) {
    return <StudySession deck={activeDeck} userId={studentId} onExit={() => { setView('LIST'); loadDecks(); }} />;
  }

  if (view === 'MANAGE_CARDS' && activeDeck) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in p-4 lg:p-8">
        <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{activeDeck.title}</h2>
            <p className="text-zinc-500 text-sm">Gerenciar Cartas ({cards.length})</p>
          </div>
          <button onClick={() => setView('LIST')} className="text-zinc-400 hover:text-white font-bold text-sm bg-zinc-900 px-4 py-2 rounded border border-zinc-800">Voltar</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 h-fit">
            <h3 className="text-white font-bold mb-4 text-sm uppercase flex items-center gap-2"><Plus size={16}/> Nova Carta</h3>
            <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Frente (Pergunta)" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white mb-2 h-24 text-sm resize-none outline-none focus:border-red-600"/>
            <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Verso (Resposta)" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white mb-4 h-24 text-sm resize-none outline-none focus:border-red-600"/>
            <button onClick={handleAddCard} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded uppercase text-xs tracking-wider">Adicionar Carta</button>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {cards.length === 0 && (
                <div className="text-zinc-500 text-center py-10 italic border-2 border-dashed border-zinc-800 rounded-xl">
                    <AlertCircle className="mx-auto mb-2 opacity-50"/>
                    Nenhuma carta neste baralho.
                </div>
            )}
            {cards.map(card => (
              <div key={card.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex justify-between items-start group hover:border-zinc-700 transition">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Frente</span>
                    <p className="text-zinc-200 text-sm mt-1">{card.front}</p>
                  </div>
                  <div className="md:border-l md:border-zinc-800 md:pl-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Verso</span>
                    <p className="text-zinc-400 text-sm mt-1">{card.back}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteCard(card.id)} className="text-zinc-600 hover:text-red-500 p-2"><X size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Layers className="text-red-600" size={32}/> Flashcards
          </h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-wide mt-1">Repetição Espaçada Tática</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-red-900/20 uppercase tracking-wide">
          <Plus size={18}/> Novo Baralho
        </button>
      </header>

      {loading && <div className="text-center py-10 text-zinc-500 animate-pulse uppercase font-bold text-xs tracking-widest">Carregando Baralhos...</div>}

      {/* MY DECKS */}
      <section className="mb-12">
        <h2 className="text-white font-bold mb-6 flex items-center gap-2 uppercase tracking-wide text-sm border-l-4 border-red-600 pl-3">
          Meus Baralhos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {!loading && myDecks.length === 0 && (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 flex flex-col items-center">
              <BookOpen size={48} className="mb-4 opacity-20"/>
              <p className="font-bold">Nenhum baralho pessoal.</p>
              <p className="text-xs mt-1">Crie um novo ou baixe da loja oficial.</p>
            </div>
          )}
          {myDecks.map(deck => (
            <DeckCard 
              key={deck.id} 
              deck={deck} 
              isOwner={true}
              onStudy={startStudy}
              onEdit={openManageCards}
              onDelete={handleDeleteDeck}
            />
          ))}
        </div>
      </section>

      {/* OFFICIAL STORE */}
      <section>
        <h2 className="text-white font-bold mb-6 flex items-center gap-2 uppercase tracking-wide text-sm border-l-4 border-blue-600 pl-3">
          Baralhos Oficiais (Download)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {!loading && officialDecks.length === 0 && <p className="col-span-full text-zinc-500 text-sm italic py-4">Nenhum baralho oficial disponível no momento.</p>}
          {officialDecks.map(deck => (
            <DeckCard 
              key={deck.id} 
              deck={deck} 
              isOwner={false}
              onStudy={() => {}} // Disabled for store items
              onImport={handleImportDeck}
            />
          ))}
        </div>
      </section>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold uppercase text-sm tracking-wide">Novo Baralho</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Título</label>
            <input 
              value={newDeckTitle} 
              onChange={e => setNewDeckTitle(e.target.value)} 
              placeholder="Ex: Direito Penal" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white mb-4 outline-none focus:border-red-600"
            />
            
            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Descrição (Opcional)</label>
            <input 
              value={newDeckDesc} 
              onChange={e => setNewDeckDesc(e.target.value)} 
              placeholder="Focado em crimes contra a vida..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white mb-6 outline-none focus:border-red-600"
            />
            
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-3 rounded font-bold hover:text-white text-xs uppercase tracking-wide">Cancelar</button>
              <button onClick={handleCreateDeck} className="flex-1 bg-red-600 text-white py-3 rounded font-bold hover:bg-red-700 text-xs uppercase tracking-wide">Criar Baralho</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
