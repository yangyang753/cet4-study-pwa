export type Difficulty = 'foundation' | 'standard' | 'challenge';
export type QuestionType = 'vocabulary' | 'news' | 'conversation' | 'passage' | 'cloze' | 'matching' | 'reading' | 'translation' | 'writing';

export interface KnowledgePoint {
  id: string;
  title: string;
  category: 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'translation' | 'writing';
  summary?: string;
}

export interface VocabularyEntry {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningZh: string;
  example: string;
  exampleZh?: string;
  derivatives: string[];
  confusables: string[];
  frequency?: number;
}

export interface QuestionOption { id: string; text: string }

export interface QuestionBase {
  id: string;
  version: number;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  knowledgePointIds: string[];
  explanationZh: string;
  sourceNote: string;
}

export interface ObjectiveQuestion extends QuestionBase {
  type: Exclude<QuestionType, 'translation' | 'writing'>;
  options: QuestionOption[];
  correctAnswer: string | string[];
  audioAssetId?: string;
}

export interface SubjectiveQuestion extends QuestionBase {
  type: 'translation' | 'writing';
  rubric: string[];
  referenceAnswer: string;
}

export type Question = ObjectiveQuestion | SubjectiveQuestion;

export interface TranscriptSegment { id: string; start: number; end: number; text: string }
export interface AudioAsset { id: string; src: string; durationSeconds: number; transcript: string; segments: TranscriptSegment[] }
export interface PracticeSet { id: string; title: string; questionIds: string[] }

export interface ContentPack {
  version: string;
  knowledgePoints: KnowledgePoint[];
  vocabulary: VocabularyEntry[];
  questions: Question[];
  practiceSets: PracticeSet[];
  audioAssets: AudioAsset[];
}

export type PracticeKind = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'translation' | 'writing';
export type CatalogQuestion = Question & {
  groupId: string;
  passage?: string;
  audioSrc?: string;
};

export interface CatalogMockExam {
  id: string;
  title: string;
  listeningSetIds: string[];
  readingSetIds: string[];
  translationId: string;
  writingId: string;
  timingMinutes: number;
}
