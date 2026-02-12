import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ComprehensionQuiz } from '../components/ComprehensionQuiz/ComprehensionQuiz';
import { ResizableSplit } from '../components/ResizableSplit/ResizableSplit';
import { RepositoryExplorer } from '../components/RepositoryExplorer/RepositoryExplorer';
import {
  loadChallengeZip,
  type HydratedChallenge,
  type LoadProgress,
} from '../challenge/loadChallengeZip';

const SLACK_INITIAL_PERCENT = 32;
const MIN_SLACK_PERCENT = 20;
const MAX_SLACK_PERCENT = 55;

const PROGRESS_LABELS: Record<LoadProgress, string> = {
  loading: 'Loading challenge…',
  downloading: 'Downloading…',
  unzipping: 'Unzipping…',
  done: '',
};

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const [hydrated, setHydrated] = useState<HydratedChallenge | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slackPercent, setSlackPercent] = useState(SLACK_INITIAL_PERCENT);

  const runLoad = useCallback(() => {
    if (!id) return;
    setError(null);
    setProgress('loading');
    setHydrated(null);
    loadChallengeZip(id, {
      onProgress: (phase) => setProgress(phase),
    })
      .then((result) => {
        setHydrated(result);
        setProgress('done');
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : 'Error';
        const detail = name && name !== 'Error' ? `${name}: ${message}` : message;
        const cause = err instanceof Error && err.cause ? ` (${String(err.cause)})` : '';
        setError(detail + cause || 'Failed to load challenge');
        setProgress(null);
      });
  }, [id]);

  useEffect(() => {
    runLoad();
  }, [runLoad]);

  if (!id) {
    return (
      <section className="flex flex-1 flex-col p-6">
        <p className="text-xs text-red-300">No challenge id provided.</p>
      </section>
    );
  }

  const metadata = hydrated?.metadata ?? {};
  const title = (metadata.title as string) ?? '';
  const difficulty = (metadata.difficulty as string) ?? '';
  const showProgress = progress && progress !== 'done';
  const progressLabel = progress ? PROGRESS_LABELS[progress] : '';

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <header className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
            Challenge
          </p>
          <h1 className="mt-1 text-base font-semibold text-slate-50 md:text-lg">
            {hydrated ? title : progressLabel || 'Loading challenge…'}
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            Deep-dive into a realistic repo and answer code comprehension questions.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {hydrated && (difficulty || id) && (
              <>
                {difficulty && (
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                    {difficulty}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  ID: <span className="font-mono">{id}</span>
                </span>
              </>
            )}
          </div>
          <Link
            to="/challenges"
            className="text-[11px] font-medium text-slate-300 hover:text-white"
          >
            ← Back to challenges
          </Link>
        </div>
      </header>

      {showProgress && (
        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-600 border-t-brand-500" />
          <p className="text-sm text-slate-300">{progressLabel}</p>
        </div>
      )}

      {error && (
        <div className="shrink-0 rounded-lg border border-red-900/60 bg-slate-900/80 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => runLoad()}
            className="mt-3 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
          >
            Retry
          </button>
        </div>
      )}

      {hydrated && !error && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {hydrated.slack != null ? (
              <ResizableSplit
                leftPercent={slackPercent}
                onResize={setSlackPercent}
                minLeftPercent={MIN_SLACK_PERCENT}
                maxLeftPercent={MAX_SLACK_PERCENT}
                left={
                  <article className="flex h-full min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden">
                    <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <h2 className="text-xs font-semibold text-slate-50">
                          #product-code-comprehension
                        </h2>
                      </div>
                      <p className="text-[10px] text-slate-400">Today</p>
                    </header>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[11px] text-slate-200">
                      <div className="flex gap-2">
                        <div className="mt-0.5 h-6 w-6 shrink-0 rounded bg-sky-500/20 text-center text-[11px] font-semibold text-sky-300">
                          PM
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-50">
                            Maya (PM)
                            <span className="ml-2 text-[10px] font-normal text-slate-400">
                              9:12 AM
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-200">
                            Customers are reporting that the &quot;Applied&quot; filter on the
                            candidates list sometimes hides people who clearly match the
                            criteria. Support has a few screenshots where the count doesn&apos;t
                            match what they see in the table.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="mt-0.5 h-6 w-6 shrink-0 rounded bg-emerald-500/20 text-center text-[11px] font-semibold text-emerald-300">
                          TL
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-50">
                            Ravi (Tech Lead)
                            <span className="ml-2 text-[10px] font-normal text-slate-400">
                              9:20 AM
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-200">
                            The list page was recently &quot;helped&quot; by an LLM refactor —
                            we moved the filter logic into a shared hook. My hunch is that the
                            new hook is reading stale query params or memoizing the wrong
                            dependencies.
                          </p>
                          <p className="mt-2 text-[11px] text-slate-200">
                            Your goal for this challenge is to read through the existing code,
                            explain what the filter logic actually does today, and call out the
                            exact line(s) you would change to make it trustworthy.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="mt-0.5 h-6 w-6 shrink-0 rounded bg-slate-700 text-center text-[11px] font-semibold text-slate-100">
                          You
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-50">
                            You
                            <span className="ml-2 text-[10px] font-normal text-slate-400">
                              9:26 AM
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-200">
                            I&apos;ll trace from the route component down into the shared
                            filtering hook and see how it builds the filter payload. I&apos;ll
                            write up what it does for each combination of query params before
                            proposing a fix.
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                }
                right={
                  <article className="flex h-full min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden">
                    <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
                      <h2 className="text-xs font-semibold text-slate-50">
                        Repository explorer
                      </h2>
                      <p className="text-[10px] text-slate-400">Read-only • drag divider to resize</p>
                    </header>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <RepositoryExplorer root={hydrated.root} />
                    </div>
                  </article>
                }
              />
            ) : (
              <article className="flex h-full min-h-0 flex-1 flex-col rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden">
                <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
                  <h2 className="text-xs font-semibold text-slate-50">
                    Repository explorer
                  </h2>
                  <p className="text-[10px] text-slate-400">Read-only • drag divider to resize</p>
                </header>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <RepositoryExplorer root={hydrated.root} />
                </div>
              </article>
            )}
          </div>

          {hydrated.comprehension ? (
            <ComprehensionQuiz quiz={hydrated.comprehension} />
          ) : (
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
              <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
                <h2 className="text-xs font-semibold text-slate-50">
                  Code comprehension questions
                </h2>
                <p className="text-[10px] text-slate-400">Static for this MVP</p>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[11px] text-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Answer based on the existing code — not guesses.
                </p>
                <ol className="list-decimal space-y-2 pl-4">
                  <li>
                    <p>
                      When the user toggles the &quot;Applied&quot; filter, which
                      component is responsible for updating the query params, and how
                      does that change flow into the filter hook?
                    </p>
                  </li>
                  <li>
                    <p>
                      For a candidate who matches the filters but is missing the
                      optional &quot;experience&quot; field, walk through why they might
                      be excluded from the results with the current implementation.
                    </p>
                  </li>
                  <li>
                    <p>
                      The tech lead suspects memoization bugs. Identify one memoized
                      value or selector that can return stale data, and explain exactly
                      which dependency is missing.
                    </p>
                  </li>
                  <li>
                    <p>
                      If you were to ship a fix, which file(s) would you touch and what
                      safety checks or tests would you add first?
                    </p>
                  </li>
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
