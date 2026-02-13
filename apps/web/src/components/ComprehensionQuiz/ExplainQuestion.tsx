import { useState, useCallback, useEffect } from 'react';
import type { ExplainQuestion } from '../../types/comprehension';
import { gradeExplain, AuthError, ApiError, type GradeExplainGrading, type RubricResultItem } from '../../api/client';

type Communication = NonNullable<import('../../api/client').GradeExplainGrading['communication']>;

function CommunicationBarChart({ communication }: { communication: Communication }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const items: { label: string; value: number }[] = [
    { label: 'Structure', value: communication.structure ?? 0 },
    { label: 'Specificity', value: communication.specificity ?? 0 },
    { label: 'Causal reasoning', value: communication.causal_reasoning ?? 0 },
    { label: 'Concision', value: communication.concision ?? 0 },
  ];
  const total = communication.comms_total ?? null;

  return (
    <div className="rounded border border-slate-600 bg-slate-800/30 px-3 py-3">
      <p className="mb-3 text-xs font-semibold text-slate-300">Writing & communication</p>
      <div className="space-y-2.5">
        {items.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[10px] text-slate-400">{label}</span>
            <div className="min-w-0 flex-1 rounded-full bg-slate-700/80 h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500/90 transition-[width] duration-700 ease-out"
                style={{ width: animated ? `${Math.round(value * 100)}%` : '0%' }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
        {total != null && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-600/80">
            <span className="w-24 shrink-0 text-[10px] font-semibold text-slate-300">Writing Quality Total</span>
            <div className="min-w-0 flex-1 rounded-full bg-slate-700/80 h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width] duration-700 ease-out delay-150"
                style={{ width: animated ? `${Math.round(total * 100)}%` : '0%' }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[10px] font-medium tabular-nums text-slate-300">
              {Math.round(total * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function buildRubricResultsFromLegacy(
  grading: GradeExplainGrading,
  question: ExplainQuestion
): RubricResultItem[] {
  const scheme = question.markScheme ?? [];
  const met = new Set(grading.feedback?.met ?? []);
  const partial = new Set(grading.feedback?.partial ?? []);
  return scheme.map((point) => {
    const id = point.id;
    const score = grading.rubric_scores?.[id]?.score ?? 0;
    let status: 'met' | 'partial' | 'missed' = 'missed';
    if (met.has(id)) status = 'met';
    else if (partial.has(id)) status = 'partial';
    return { id, label: point.text ?? id, status, score };
  });
}

type Props = {
  question: ExplainQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
  /** Score 0–100 required to count as "correct" for quiz progress. Default 60. */
  passingScorePercent?: number;
};

export function ExplainQuestion({ question, answered, onAnswer, passingScorePercent = 60 }: Props) {
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [grading, setGrading] = useState<import('../../api/client').GradeExplainGrading | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || answered || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await gradeExplain(answer.trim(), question as unknown as Record<string, unknown>);
      setScore(res.score);
      if (res.grading) setGrading(res.grading);
      onAnswer(res.score >= passingScorePercent);
    } catch (e) {
      if (e instanceof AuthError || e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Failed to grade answer. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [answer, answered, onAnswer, question, submitting, passingScorePercent]);

  // Intentionally never render question.markScheme (would allow cheating) or question.modelAnswer (encourages retry).
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-200">{question.question}</p>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={answered}
          placeholder="Type your answer here..."
          className="w-full min-h-[120px] rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {question.avoidPoints && question.avoidPoints.length > 0 && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3">
          <p className="mb-2 text-xs font-semibold text-red-300">Avoid:</p>
          <ul className="space-y-1.5">
            {question.avoidPoints.map((point) => (
              <li key={point.id} className="flex items-start gap-2 text-[10px] text-red-300/80">
                <span className="mt-0.5 shrink-0">✗</span>
                <span>
                  {point.text}
                  {point.fatal && (
                    <span className="ml-1 font-semibold text-red-400">(fatal)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!answered && answer.trim() && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Grading…' : 'Submit Answer'}
        </button>
      )}

      {answered && score !== null && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-200">
            Score: {score}% {score >= passingScorePercent ? '(passed)' : '(below threshold)'}
          </p>
          {grading && (() => {
            const rubricRows = grading.rubric_results ?? buildRubricResultsFromLegacy(grading, question);
            const missedCount = rubricRows.filter((r) => r.status === 'missed').length;
            return rubricRows.length > 0 ? (
              <div className="space-y-1.5">
                <div className="overflow-x-auto rounded border border-slate-600 bg-slate-800/40">
                  <table className="w-full min-w-[280px] text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-600 text-left">
                        <th className="px-3 py-2 font-semibold text-slate-300">Criterion</th>
                        <th className="px-3 py-2 font-semibold text-slate-300 w-20">Status</th>
                        <th className="px-3 py-2 font-semibold text-slate-300 w-14 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rubricRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-700/80 last:border-0">
                          <td className="px-3 py-2 text-slate-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                row.status === 'met'
                                  ? 'text-emerald-400'
                                  : row.status === 'partial'
                                    ? 'text-amber-400'
                                    : 'text-slate-500'
                              }
                            >
                              {row.status === 'met' ? 'Met' : row.status === 'partial' ? 'Partial' : 'Missed'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                            {row.score === 1 ? '1' : row.score === 0.5 ? '0.5' : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400">
                  {missedCount === 0
                    ? 'All marking points were addressed in your answer.'
                    : `${missedCount} marking point${missedCount === 1 ? '' : 's'} not present in your answer.`}
                </p>
              </div>
            ) : null;
          })()}
          {grading && (
            <>
              {grading.communication && (
                <CommunicationBarChart communication={grading.communication} />
              )}
              {grading.incorrect_claims && grading.incorrect_claims.length > 0 && (
                <div className="rounded border border-red-800/50 bg-red-900/20 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-red-300">Incorrect or misleading</p>
                  <ul className="space-y-1 text-[10px] text-red-200/90">
                    {grading.incorrect_claims.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium text-red-300">{c.severity}: </span>
                        {c.text ?? c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {grading?.feedback?.top_improvements && grading.feedback.top_improvements.length > 0 && (
            <div className="rounded border border-slate-600 bg-slate-800/50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-300">Suggestions to improve</p>
              <ul className="list-inside list-disc space-y-1 text-[10px] text-slate-400">
                {grading.feedback.top_improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {answered && question.feedback && (
        <div className="rounded bg-slate-800/60 px-3 py-2 text-[10px] text-slate-300">
          {question.feedback.correct || question.feedback.incorrect}
        </div>
      )}
    </div>
  );
}
