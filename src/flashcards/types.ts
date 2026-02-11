
export interface FlashcardDeck {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  is_official: boolean;
  created_at: string;
  card_count?: number; // Join count
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
}

export interface FlashcardLog {
  id: string;
  user_id: string;
  card_id: string;
  next_review: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
}
