import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Challenge, getChallenges } from '../api/mockClient';

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getChallenges().then((data) => {
      if (!cancelled) {
        setChallenges(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

      {loading && (
        <p className="mt-4 text-xs text-slate-400">Loading challenges…</p>
      )}

      {!loading && challenges && (
        <ul className="mt-2 grid gap-3 md:grid-cols-2">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="group rounded-lg border border-slate-800 bg-slate-900/80 p-4 hover:border-brand-500/70 hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    {challenge.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">
                    {challenge.summary}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                  {challenge.difficulty}
                </span>
              </div>

              <div className="mt-3">
                <Link
                  to={`/challenges/${challenge.id}`}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300"
                >
                  View details →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
