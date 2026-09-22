export type MistakeReason = 'unknown' | 'misunderstood' | 'location' | 'guessed' | 'careless' | 'overtime';

export interface Attempt {
  id: string;
  userId: string;
  questionId: string;
  response: unknown;
  correct: boolean | null;
  score: number | null;
  durationSeconds: number;
  mistakeReason?: MistakeReason;
  createdAt: string;
}
