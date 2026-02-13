/**
 * Types for comprehension.json quiz schema (multiple choice + pro/con sort + explain).
 */

export interface ComprehensionChoice {
  id: string;
  label: string;
  isCorrect?: boolean;
  feedback?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  disabled?: boolean;
}

export interface ComprehensionQuestionFeedback {
  correct?: string;
  incorrect?: string;
}

export interface ProConColumn {
  id: string;
  label: string;
}

export interface ProConStatement {
  id: string;
  text: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  disabled?: boolean;
}

export interface ProConScoring {
  mode?: 'allOrNothing' | 'partial';
  penalizeIncorrect?: boolean;
}

export interface BaseComprehensionQuestion {
  id: string;
  type: 'multipleChoice' | 'proConSort' | 'explain';
  prompt: string;
  helpText?: string;
  explanation?: string;
}

export interface MultipleChoiceQuestion extends BaseComprehensionQuestion {
  type: 'multipleChoice';
  shuffleChoices?: boolean;
  selectionType?: 'single' | 'multiple';
  choices: ComprehensionChoice[];
  correctChoiceIds?: string[];
  feedback?: ComprehensionQuestionFeedback;
}

export interface ProConSortQuestion extends BaseComprehensionQuestion {
  type: 'proConSort';
  shuffleStatements?: boolean;
  columns?: ProConColumn[];
  statements: ProConStatement[];
  correctPlacements: Record<string, string>; // statementId -> columnId
  scoring?: ProConScoring;
  feedback?: ComprehensionQuestionFeedback;
}

export interface MarkSchemePoint {
  id: string;
  text: string;
  required?: boolean;
  weight?: number;
}

export interface AvoidPoint {
  id: string;
  text: string;
  weight?: number;
  fatal?: boolean;
  feedback?: string;
}

export interface ExplainScoring {
  mode?: 'allOrNothing' | 'partial';
}

export interface AvoidScoring {
  mode?: 'deduct' | 'fail';
  floorAtZero?: boolean;
  maxPenalty?: number;
}

export interface ExplainQuestion extends BaseComprehensionQuestion {
  type: 'explain';
  question: string;
  modelAnswer?: string;
  markScheme: MarkSchemePoint[];
  avoidPoints?: AvoidPoint[];
  scoring?: ExplainScoring;
  avoidScoring?: AvoidScoring;
  feedback?: ComprehensionQuestionFeedback;
  /** Optional code snippet shown with the question; sent to grading API. */
  codeSnippet?: string;
}

export type ComprehensionQuestion = MultipleChoiceQuestion | ProConSortQuestion | ExplainQuestion;

export interface ComprehensionQuiz {
  id?: string;
  title: string;
  description?: string;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  passingScore?: number;
  /** For explain questions: score 0–100 required to count as "correct". Default 60. */
  explainPassingPercent?: number;
  questions: ComprehensionQuestion[];
}
