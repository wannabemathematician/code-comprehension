import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChallenges, AuthError, type ListChallengeItem } from '../api/client';
import { login } from '../lib/auth';

export default function Challenges() {
  const [challenges, setChallenges] = useState<ListChallengeItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchChallenges = useCallback(() => {
    setLoading(true);
    setUnauthorized(false);
    setFetchError(null);
    listChallenges()
      .then((data) => {
        setChallenges(data.challenges);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof AuthError) {
          setUnauthorized(true);
        } else {
          setFetchError(err instanceof Error ? err.message : 'Failed to load challenges');
        }
      });
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  if (loading) {
    return (
      <section className="flex flex-1 flex-col p-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
          <p className="mt-1 text-xs text-slate-300">
            Pick a scenario to practice reading real-world codebases.
          </p>
        </header>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-600 border-t-brand-500" />
          <p className="text-sm text-slate-400">Loading challenges…</p>
        </div>
      </section>
    );
  }

  if (unauthorized) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-50">Please log in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to view and start challenges.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => login()}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={fetchChallenges}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (fetchError) {
    return (
      <section className="flex flex-1 flex-col p-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
        </header>
        <div className="rounded-lg border border-red-900/60 bg-slate-900/80 px-4 py-3">
          <p className="text-sm text-red-200">{fetchError}</p>
          <button
            type="button"
            onClick={fetchChallenges}
            className="mt-3 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
          <p className="mt-1 text-xs text-slate-300">
            Pick a scenario to practice reading real-world codebases.
          </p>
        </div>
      </header>

      {challenges && challenges.length > 0 ? (
        <ul className="mt-2 grid gap-3 md:grid-cols-2">
          {challenges.map((challenge) => (
            <li key={challenge.challengeId}>
              <Link
                to={`/challenges/${challenge.challengeId}`}
                className="group block rounded-lg border border-slate-800 bg-slate-900/80 p-4 hover:border-brand-500/70 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50">
                      {challenge.title ?? 'Untitled'}
                    </h2>
                    {challenge.tags && challenge.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {challenge.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {challenge.difficulty && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                      {challenge.difficulty}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold text-brand-400 group-hover:text-brand-300">
                  View details →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <h2 className="text-base font-semibold text-slate-50">Empty state</h2>
          <p className="mt-2 text-sm text-slate-400">
            No published challenges exist yet. Challenges with{' '}
            <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-slate-300">
              status=&quot;published&quot;
            </code>{' '}
            will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
