export interface QuestionPayload {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

export type AssessmentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
