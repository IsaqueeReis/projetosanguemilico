
import { supabase } from '../services/supabase';
import { FlashcardDeck, Flashcard } from './types';

export const FlashcardService = {
  // --- DECKS ---
  async getMyDecks(userId: string): Promise<FlashcardDeck[]> {
    const { data, error } = await supabase
      .from('fc_decks')
      .select('*, fc_cards(count)')
      .eq('owner_id', userId)
      .eq('is_official', false) // Meus decks privados
      .order('created_at', { ascending: false });
    
    if (error) { console.error(error); return []; }
    return data.map((d: any) => ({ ...d, card_count: d.fc_cards[0].count }));
  },

  async getOfficialDecks(): Promise<FlashcardDeck[]> {
    const { data, error } = await supabase
      .from('fc_decks')
      .select('*, fc_cards(count)')
      .eq('is_official', true)
      .order('title');

    if (error) { console.error(error); return []; }
    return data.map((d: any) => ({ ...d, card_count: d.fc_cards[0].count }));
  },

  async createDeck(userId: string, title: string, description: string, isOfficial: boolean = false) {
    return await supabase.from('fc_decks').insert({
      owner_id: userId,
      title,
      description,
      is_official: isOfficial
    }).select().single();
  },

  async deleteDeck(deckId: string) {
    return await supabase.from('fc_decks').delete().eq('id', deckId);
  },

  // --- IMPORTAÇÃO (CLONAGEM INTELIGENTE) ---
  async importDeck(userId: string, originalDeckId: string) {
    // 1. Busca Deck Original
    const { data: originalDeck } = await supabase.from('fc_decks').select('*').eq('id', originalDeckId).single();
    if (!originalDeck) throw new Error("Deck original não encontrado");

    // 2. Busca Cartas Originais
    const { data: cards } = await supabase.from('fc_cards').select('*').eq('deck_id', originalDeckId);
    if (!cards || cards.length === 0) throw new Error("Deck vazio");

    // 3. Cria Novo Deck para o Aluno
    const { data: newDeck, error: deckError } = await supabase.from('fc_decks').insert({
      owner_id: userId,
      title: `${originalDeck.title}`,
      description: `Importado de Oficial. ${originalDeck.description || ''}`,
      is_official: false
    }).select().single();

    if (deckError) throw deckError;

    // 4. Clona as cartas em lote
    const newCards = cards.map((c: any) => ({
      deck_id: newDeck.id,
      front: c.front,
      back: c.back
    }));

    if (newCards.length > 0) {
      await supabase.from('fc_cards').insert(newCards);
    }
  },

  // --- CARDS ---
  async getCards(deckId: string): Promise<Flashcard[]> {
    const { data } = await supabase.from('fc_cards').select('*').eq('deck_id', deckId).order('created_at');
    return data || [];
  },

  async createCard(deckId: string, front: string, back: string) {
    return await supabase.from('fc_cards').insert({ deck_id: deckId, front, back });
  },

  async deleteCard(cardId: string) {
    return await supabase.from('fc_cards').delete().eq('id', cardId);
  },

  // --- ESTUDO & SRS (SM-2 Simplificado) ---
  async getCardsDue(userId: string, deckId: string): Promise<Flashcard[]> {
    // Busca cartas do deck
    const { data: allCards } = await supabase.from('fc_cards').select('*').eq('deck_id', deckId);
    if (!allCards) return [];

    // Busca logs do usuário para essas cartas
    const { data: logs } = await supabase.from('fc_study_logs').select('*').eq('user_id', userId).in('card_id', allCards.map(c => c.id));
    
    const now = new Date();
    // Filtra: Novas (sem log) OU Vencidas (next_review <= now)
    const dueCards = allCards.filter(card => {
      const log = logs?.find((l: any) => l.card_id === card.id);
      if (!log) return true; // Nova
      return new Date(log.next_review) <= now; // Vencida
    });

    return dueCards;
  },

  async submitReview(userId: string, cardId: string, quality: number) {
    // quality: 0 (Errei), 1 (Difícil), 2 (Bom), 3 (Fácil)
    
    const { data: existingLog } = await supabase.from('fc_study_logs').select('*').eq('user_id', userId).eq('card_id', cardId).single();
    
    let interval = existingLog ? existingLog.interval : 0;
    let repetitions = existingLog ? existingLog.repetitions : 0;
    let easeFactor = existingLog ? existingLog.ease_factor : 2.5;

    if (quality === 0) {
      interval = 0; // Reset
      repetitions = 0;
    } else {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 3;
      else interval = Math.ceil(interval * easeFactor);
      
      repetitions++;
      if (quality === 1) easeFactor = Math.max(1.3, easeFactor - 0.2); // Hard penalty
      if (quality === 3) easeFactor += 0.1; // Easy bonus
    }

    const nextDate = new Date();
    // Se interval == 0, revisa hoje/agora (mantém data atual ou +alguns minutos se fosse app real, aqui vamos por +1 dia se acertou min)
    if (interval === 0) {
        // Mantém para revisão imediata (ou amanhã se preferir lógica diária estrita)
        // No SM-2 puro, quality 0 repete na mesma sessão. Aqui vamos agendar para amanhã para simplificar a UX Web
        nextDate.setDate(nextDate.getDate() + 1); 
    } else {
        nextDate.setDate(nextDate.getDate() + interval);
    }

    return await supabase.from('fc_study_logs').upsert({
      user_id: userId,
      card_id: cardId,
      next_review: nextDate.toISOString(),
      interval,
      ease_factor: easeFactor,
      repetitions
    }, { onConflict: 'user_id, card_id' });
  }
};
