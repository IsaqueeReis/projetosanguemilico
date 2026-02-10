
export interface EssayTopic {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export type EssayStatus = 'PENDING' | 'CORRECTING' | 'DONE';

export interface EssaySubmission {
  id: string;
  topic_id: string;
  student_id: string;
  student_name: string;
  content_text: string;
  file_url?: string;
  status: EssayStatus;
  created_at: string;
  topic_title?: string; // Joined field
  review?: EssayReview; // Joined field
}

export interface EssayReview {
  id: string;
  submission_id: string;
  mentor_id?: string;
  final_score: number;
  feedback_text: string;
  competencies_json: Record<string, number>;
  created_at: string;
}

export interface AIQuestionExtraction {
  statement: string;
  alternatives: { label: string; text: string; is_correct: boolean }[];
  subject_suggestion?: string;
  board_suggestion?: string;
}
