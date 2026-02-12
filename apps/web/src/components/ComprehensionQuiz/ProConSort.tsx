import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProConSortQuestion } from '../../types/comprehension';

type Props = {
  question: ProConSortQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
};

export function ProConSort({ question, answered, onAnswer }: Props) {
  const columns = question.columns ?? [
    { id: 'pro', label: 'Pro' },
    { id: 'con', label: 'Con' },
  ];
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Ensure statements is an array
  const safeStatements = Array.isArray(question.statements) ? question.statements : [];
  
  const [statements, setStatements] = useState(() => {
    if (safeStatements.length === 0) return [];
    const stmts = [...safeStatements];
    if (question.shuffleStatements !== false) {
      const shuffled = [...stmts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return stmts;
  });

  // Reset statements and placements when question changes
  useEffect(() => {
    if (safeStatements.length === 0) {
      setStatements([]);
      setPlacements({});
      setDraggedId(null);
      setDragOverColumn(null);
      return;
    }
    const stmts = [...safeStatements];
    if (question.shuffleStatements !== false) {
      const shuffled = [...stmts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setStatements(shuffled);
    } else {
      setStatements(stmts);
    }
    setPlacements({});
    setDraggedId(null);
    setDragOverColumn(null);
  }, [question.id, question.shuffleStatements, safeStatements]);

  const handleDragStart = useCallback((e: React.DragEvent, statementId: string) => {
    if (answered) return;
    setDraggedId(statementId);
    e.dataTransfer.effectAllowed = 'move';
  }, [answered]);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    if (answered) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, [answered]);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      if (answered || !draggedId) return;
      e.preventDefault();
      setPlacements((prev) => ({ ...prev, [draggedId]: columnId }));
      setDraggedId(null);
      setDragOverColumn(null);
    },
    [answered, draggedId]
  );

  const handleRemove = useCallback(
    (statementId: string) => {
      if (answered) return;
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[statementId];
        return next;
      });
    },
    [answered]
  );

  const handleSubmit = useCallback(() => {
    if (answered || safeStatements.length === 0) return;
    const allPlaced = safeStatements.every((s) => s.id in placements);
    if (!allPlaced) return;

    const correctPlacements = question.correctPlacements || {};
    const scoring = question.scoring ?? { mode: 'allOrNothing' };
    const mode = scoring.mode ?? 'allOrNothing';

    let correct = false;
    if (mode === 'allOrNothing') {
      correct = safeStatements.every(
        (s) => placements[s.id] === correctPlacements[s.id]
      );
    } else {
      const correctCount = safeStatements.filter(
        (s) => placements[s.id] === correctPlacements[s.id]
      ).length;
      const total = safeStatements.length;
      const score = scoring.penalizeIncorrect
        ? (correctCount - (total - correctCount)) / total
        : correctCount / total;
      correct = score > 0;
    }

    onAnswer(correct);
  }, [answered, placements, question, onAnswer, safeStatements]);

  const isCorrect = useMemo(() => {
    if (!answered || safeStatements.length === 0) return null;
    const correctPlacements = question.correctPlacements || {};
    return safeStatements.every(
      (s) => placements[s.id] === correctPlacements[s.id]
    );
  }, [answered, placements, question, safeStatements]);

  const unplacedStatements = statements.filter((s) => !(s.id in placements));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {columns.map((col) => {
          const columnStatements = statements.filter((s) => placements[s.id] === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={[
                'min-h-[200px] rounded-lg border-2 border-dashed p-3 transition-colors',
                dragOverColumn === col.id
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 bg-slate-800/30',
              ].join(' ')}
            >
              <h3 className="mb-2 text-xs font-semibold text-slate-300">{col.label}</h3>
              <div className="space-y-2">
                {columnStatements.map((stmt) => {
                  const correct = answered && question.correctPlacements[stmt.id] === col.id;
                  const incorrect = answered && question.correctPlacements[stmt.id] !== col.id;
                  const feedback = correct
                    ? stmt.feedbackCorrect
                    : incorrect
                      ? stmt.feedbackIncorrect
                      : undefined;
                  return (
                    <div
                      key={stmt.id}
                      draggable={!answered && !stmt.disabled}
                      onDragStart={(e) => handleDragStart(e, stmt.id)}
                      className={[
                        'cursor-move rounded border px-2.5 py-2 text-[10px] transition-colors',
                        correct
                          ? 'border-emerald-600/80 bg-emerald-500/10'
                          : incorrect
                            ? 'border-red-600/80 bg-red-500/10'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500',
                        answered && 'cursor-default',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex-1">{stmt.text}</span>
                        {!answered && (
                          <button
                            type="button"
                            onClick={() => handleRemove(stmt.id)}
                            className="shrink-0 text-slate-400 hover:text-slate-200"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {feedback && (
                        <p
                          className={[
                            'mt-1 text-[9px]',
                            correct ? 'text-emerald-400' : 'text-red-400',
                          ].join(' ')}
                        >
                          {feedback}
                        </p>
                      )}
                    </div>
                  );
                })}
                {columnStatements.length === 0 && (
                  <p className="text-[10px] text-slate-500">Drop statements here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unplacedStatements.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-slate-300">Statements</h3>
          <div className="space-y-2">
            {unplacedStatements.map((stmt) => (
              <div
                key={stmt.id}
                draggable={!answered && !stmt.disabled}
                onDragStart={(e) => handleDragStart(e, stmt.id)}
                className={[
                  'cursor-move rounded border border-slate-600 bg-slate-700/50 px-2.5 py-2 text-[10px] transition-colors hover:border-slate-500',
                  answered && 'cursor-default opacity-60',
                ].join(' ')}
              >
                {stmt.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {safeStatements.length > 0 && safeStatements.every((s) => s.id in placements) && !answered && (
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500"
        >
          Submit
        </button>
      )}
      
      {safeStatements.length === 0 && (
        <p className="text-[10px] text-red-400">Error: No statements found for this question.</p>
      )}

      {answered && question.feedback && (
        <div
          className={[
            'rounded px-3 py-2 text-[10px]',
            isCorrect
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400',
          ].join(' ')}
        >
          {isCorrect ? question.feedback.correct : question.feedback.incorrect}
        </div>
      )}
    </div>
  );
}
