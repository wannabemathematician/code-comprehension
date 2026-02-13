import { useCallback, useMemo, useState } from 'react';
import type {
  ComprehensionChoice,
  ComprehensionQuestion,
  ComprehensionQuiz,
  MultipleChoiceQuestion,
  ProConSortQuestion,
  ExplainQuestion,
} from '../../types/comprehension';
import { ProConSort } from './ProConSort';
import { ExplainQuestion as ExplainQuestionComponent } from './ExplainQuestion';

type Props = {
  quiz: ComprehensionQuiz;
  onComplete?: () => void;
};

function isMultipleChoice(q: ComprehensionQuestion): q is MultipleChoiceQuestion {
  return q.type === 'multipleChoice' && Array.isArray(q.choices);
}

function isProConSort(q: ComprehensionQuestion): q is ProConSortQuestion {
  return q.type === 'proConSort' && Array.isArray(q.statements);
}

function isExplain(q: ComprehensionQuestion): q is ExplainQuestion {
  return q.type === 'explain' && typeof q.question === 'string' && Array.isArray(q.markScheme);
}

function getCorrectChoiceIds(q: MultipleChoiceQuestion): Set<string> {
  if (q.correctChoiceIds && q.correctChoiceIds.length > 0) {
    return new Set(q.correctChoiceIds);
  }
  return new Set(q.choices.filter((c) => c.isCorrect === true).map((c) => c.id));
}

function isCorrectAnswer(q: MultipleChoiceQuestion, selectedIds: string[]): boolean {
  const correct = getCorrectChoiceIds(q);
  if (selectedIds.length !== correct.size) return false;
  return selectedIds.every((id) => correct.has(id));
}

function getFeedbackMessage(
  q: MultipleChoiceQuestion,
  choice: ComprehensionChoice,
  correct: boolean
): string | undefined {
  if (correct) return choice.feedbackCorrect ?? choice.feedback ?? q.feedback?.correct;
  return choice.feedbackIncorrect ?? choice.feedback ?? q.feedback?.incorrect;
}

export function ComprehensionQuiz({ quiz, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  const questions = quiz.questions;
  const current = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;
  const isMultipleChoiceQ = current && isMultipleChoice(current);
  const isProConSortQ = current && isProConSort(current);
  const isExplainQ = current && isExplain(current);
  const isSingle = isMultipleChoiceQ && (current.selectionType ?? 'single') === 'single';

  const handleProConAnswer = useCallback(
    (correct: boolean) => {
      if (answered) return;
      setAnswered(true);
      if (correct) {
        setCorrectCount((c) => c + 1);
      }
      // Track that this question was answered
      if (current) {
        setAnsweredQuestions((prev) => new Set(prev).add(current.id));
      }
    },
    [answered, current]
  );

  const handleExplainAnswer = useCallback(
    (correct: boolean) => {
      if (answered) return;
      setAnswered(true);
      // For explain questions, we mark as correct for now
      // In a real implementation, this would be evaluated against mark scheme
      if (correct) {
        setCorrectCount((c) => c + 1);
      }
      // Track that this question was answered
      if (current) {
        setAnsweredQuestions((prev) => new Set(prev).add(current.id));
      }
    },
    [answered, current]
  );

  const toggleChoice = useCallback(
    (id: string) => {
      if (answered || !isMultipleChoiceQ) return;
      if (isSingle) {
        setSelectedIds([id]);
        setAnswered(true);
        const correct = isCorrectAnswer(current, [id]);
        if (correct) {
          setCorrectCount((c) => c + 1);
        }
        // Track that this question was answered
        setAnsweredQuestions((prev) => new Set(prev).add(current.id));
      } else {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
      }
    },
    [answered, isSingle, current, isMultipleChoiceQ]
  );

  const submitMultiple = useCallback(() => {
    if (!isMultipleChoiceQ || answered) return;
    setAnswered(true);
    const correct = isCorrectAnswer(current, selectedIds);
    if (correct) {
      setCorrectCount((c) => c + 1);
    }
    // Track that this question was answered
    setAnsweredQuestions((prev) => new Set(prev).add(current.id));
  }, [current, selectedIds, answered, isMultipleChoiceQ]);

  const goNext = useCallback(() => {
    if (isLast) {
      setCompleted(true);
      // Call onComplete callback when all questions are answered
      if (onComplete) {
        onComplete();
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedIds([]);
      setAnswered(false);
    }
  }, [isLast, onComplete]);

  const correctIds = useMemo(
    () => (isMultipleChoiceQ ? getCorrectChoiceIds(current) : new Set<string>()),
    [current, isMultipleChoiceQ]
  );

  const feedbackForChoice = useMemo(() => {
    if (!isMultipleChoiceQ || !answered) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const c of current.choices) {
      const selected = selectedIds.includes(c.id);
      const correct = correctIds.has(c.id);
      const msg = selected ? getFeedbackMessage(current, c, correct) : undefined;
      if (msg) m.set(c.id, msg);
    }
    return m;
  }, [current, answered, selectedIds, correctIds, isMultipleChoiceQ]);

  if (completed) {
    const pct =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;
    const passed =
      quiz.passingScore != null ? correctCount / questions.length >= quiz.passingScore : null;
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
          <h2 className="text-xs font-semibold text-slate-50">{quiz.title}</h2>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm font-semibold text-slate-200">Quiz complete</p>
          <p className="text-2xl font-bold text-slate-50">
            {correctCount} / {questions.length}
          </p>
          <p className="text-[11px] text-slate-400">({pct}%)</p>
          {passed !== null && (
            <p className={passed ? 'text-emerald-400' : 'text-amber-400'}>
              {passed ? 'Passed' : 'Did not pass'}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
          <h2 className="text-xs font-semibold text-slate-50">{quiz.title}</h2>
        </header>
        <div className="flex flex-1 items-center justify-center p-4 text-[11px] text-slate-400">
          No questions in this quiz.
        </div>
      </section>
    );
  }

  const showScore = (
    <span className="text-[11px] font-medium text-slate-300">
      Score: {correctCount} / {questions.length}
    </span>
  );

  // Show completion badge when all questions are answered
  const allQuestionsAnswered = answeredQuestions.size === questions.length;
  const completionBadge = allQuestionsAnswered ? (
    <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      Completed
    </span>
  ) : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-50">{quiz.title}</h2>
          {completionBadge}
        </div>
        {showScore}
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 text-[11px] text-slate-200">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Question {currentIndex + 1} of {questions.length}
        </p>
        {(isMultipleChoiceQ || isProConSortQ) && (
          <p className="font-medium text-slate-100">{current.prompt}</p>
        )}
        {isExplainQ && current.prompt && (
          <p className="font-medium text-slate-100">{current.prompt}</p>
        )}
        {isMultipleChoiceQ && isMultipleChoice(current) ? (
          <>
            <ul className="space-y-2">
              {current.choices.map((choice) => {
                const selected = selectedIds.includes(choice.id);
                const correct = correctIds.has(choice.id);
                const disabled = answered || (choice.disabled === true);
                const fb = feedbackForChoice.get(choice.id);
                const showCorrect = answered && selected && correct;
                const showIncorrect = answered && selected && !correct;
                return (
                  <li key={choice.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleChoice(choice.id)}
                      className={[
                        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                        'border-slate-700 bg-slate-800/50 hover:border-slate-600',
                        disabled && 'cursor-default opacity-80',
                        selected && !answered && 'border-sky-500/60 bg-sky-500/10',
                        showCorrect && 'border-emerald-600/80 bg-emerald-500/10',
                        showIncorrect && 'border-red-600/80 bg-red-500/10',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        {isSingle ? (
                          <span
                            className={[
                              'h-4 w-4 shrink-0 rounded-full border-2',
                              selected ? 'border-sky-400 bg-sky-500/30' : 'border-slate-500',
                            ].join(' ')}
                          />
                        ) : (
                          <span
                            className={[
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px]',
                              selected ? 'border-sky-400 bg-sky-500/30' : 'border-slate-500',
                            ].join(' ')}
                          >
                            {selected ? '✓' : ''}
                          </span>
                        )}
                        <span>{choice.label}</span>
                      </span>
                    </button>
                    {fb && (
                      <p
                        className={
                          showCorrect
                            ? 'mt-1 pl-7 text-[10px] text-emerald-400'
                            : 'mt-1 pl-7 text-[10px] text-red-400'
                        }
                      >
                        {fb}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {isSingle === false && !answered && selectedIds.length > 0 && (
              <button
                type="button"
                onClick={submitMultiple}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500"
              >
                Submit
              </button>
            )}
            {isSingle === false && answered && (
              <button
                type="button"
                onClick={submitMultiple}
                className="hidden"
                aria-hidden
              />
            )}
          </>
        ) : isProConSortQ && isProConSort(current) ? (
          <ProConSort
            key={current.id}
            question={current}
            answered={answered}
            onAnswer={handleProConAnswer}
          />
        ) : isExplainQ && isExplain(current) ? (
          <ExplainQuestionComponent
            key={current.id}
            question={current}
            answered={answered}
            onAnswer={handleExplainAnswer}
            passingScorePercent={quiz.explainPassingPercent ?? 60}
          />
        ) : (
          <div className="rounded bg-red-500/10 px-3 py-2 text-[10px] text-red-400">
            Error: Unsupported question type. Supported types are multipleChoice, proConSort, and explain.
          </div>
        )}
        {current.explanation && answered && (
          <div className="rounded bg-slate-800/60 px-3 py-2 text-[10px] text-slate-400">
            <span className="font-semibold text-slate-300">Explanation: </span>
            {current.explanation}
          </div>
        )}
        {answered && (
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-500"
          >
            {isLast ? 'Finish' : 'Next question'}
          </button>
        )}
      </div>
    </section>
  );
}
