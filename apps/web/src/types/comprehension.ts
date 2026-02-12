/**
 * Types for comprehension.json quiz schema (multiple choice + pro/con sort).
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
  type: 'multipleChoice' | 'proConSort';
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

export type ComprehensionQuestion = MultipleChoiceQuestion | ProConSortQuestion;

export interface ComprehensionQuiz {
  id?: string;
  title: string;
  description?: string;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  passingScore?: number;
  questions: ComprehensionQuestion[];
}
